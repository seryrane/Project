package com.example.backend;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.store.JsonStore;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
// Spring Boot 4 — MockMvc 자동구성이 webmvc 모듈로 옮겨졌다
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** 공통 기능 API 스모크 — FastAPI 벌의 pytest 와 같은 것을 검사한다(두 벌 정합). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiSmokeTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JsonStore store;

    @Test
    void health() throws Exception {
        mvc.perform(get("/api/health")).andExpect(jsonPath("$.status", is("ok")));
    }

    @Test
    void meAndDerivations() throws Exception {
        mvc.perform(get("/api/me"))
            .andExpect(jsonPath("$.name", is("김현대")))
            .andExpect(jsonPath("$.gradeName", is("Super Admin")));

        // 메뉴는 권한의 파생물 — Super Admin 은 privacy·roles 가 보이고, 최소 메뉴도 내려온다
        mvc.perform(get("/api/me/menu"))
            .andExpect(jsonPath("$[*].items[*].key", hasItem("privacy")))
            .andExpect(jsonPath("$[*].items[*].key", hasItem("roles")))
            .andExpect(jsonPath("$[*].items[*].key", hasItem("guide")));

        mvc.perform(get("/api/me/features"))
            .andExpect(jsonPath("$", hasItem("community.read")));

        mvc.perform(get("/api/me/abilities"))
            .andExpect(jsonPath("$.roles[0]", is("Super Admin")));
    }

    /**
     * 사양서 카탈로그도 **권한을 탄다** — 화면(⌘K 팔레트)이 정적 목록을 읽던 시절에는
     * 사양서 관리 조회 권한이 없어도 이름이 그대로 보였다. 메뉴와 같은 저울(`canView`)을
     * 쓰는지, 그리고 권한을 걷으면 **빈 목록**이 되는지(403 이 아니다) 확인한다.
     */
    @Test
    @SuppressWarnings("unchecked")
    void specCatalogFollowsPermission() throws Exception {
        mvc.perform(get("/api/specs"))
            .andExpect(jsonPath("$[*].name", hasItem("VN7 엔진 사양서")));

        // ⚠ `/submissions` 는 **접수만** 한다(매트릭스를 적용하지 않는다) — 권한을 바꾸려면
        //    역할 정본을 직접 건드려야 한다. 상신으로 바꾸려다 한 번 헛짚었다.
        List<Map<String, Object>> before = store.kvGet("roles", JsonStore.LIST);
        List<Map<String, Object>> stripped = before.stream().map(role -> {
            if (!"super".equals(role.get("key"))) {
                return role;
            }
            Map<String, Object> copy = new HashMap<>(role);
            Map<String, Object> matrix = new HashMap<>((Map<String, Object>) role.get("matrix"));
            matrix.put("사양서 관리", List.of());
            copy.put("matrix", matrix);
            return copy;
        }).toList();

        store.kvPut("roles", stripped);
        try {
            // 못 보는 사람에게는 **빈 목록**이다 — 403 이 아니다(없는 것과 막힌 것을 가른다)
            mvc.perform(get("/api/specs")).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
        } finally {
            // 되돌린다 — 이 테스트가 뒤 테스트의 전제를 바꾸지 않게
            store.kvPut("roles", before);
        }
        mvc.perform(get("/api/specs")).andExpect(jsonPath("$[*].name", hasItem("VN7 엔진 사양서")));
    }

    @Test
    void dashboardLayoutRoundtrip() throws Exception {
        mvc.perform(put("/api/me/dashboard-layout")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"layout\":[{\"id\":\"kpi\",\"size\":3}]}"))
            .andExpect(status().isOk());
        mvc.perform(get("/api/me/dashboard-layout"))
            .andExpect(jsonPath("$.layout[0].id", is("kpi")));
    }

    @Test
    void noticeCreateAndReject() throws Exception {
        mvc.perform(post("/api/notices")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"테스트 공지\",\"category\":\"시스템\",\"body\":\"본문\"}"))
            .andExpect(jsonPath("$.author", is("김현대")));
        // 제목 없는 등록은 거절 — 빈 정본을 만들지 않는다
        mvc.perform(post("/api/notices")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\" \"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void answerAppends() throws Exception {
        mvc.perform(post("/api/questions/Q-108/answers")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"테스트 답변\"}"))
            .andExpect(jsonPath("$.answers[-1:].body", hasItem("테스트 답변")));
    }

    @Test
    void faqHelpfulCountsUp() throws Exception {
        mvc.perform(post("/api/faqs/F-01/helpful"))
            .andExpect(jsonPath("$.helpful", not(is(0))));
    }

    @Test
    void memberLockToggleLeavesAudit() throws Exception {
        mvc.perform(post("/api/members/u-08/lock-toggle"))
            .andExpect(jsonPath("$.status", is("활성")));
        mvc.perform(post("/api/members/u-08/lock-toggle"))
            .andExpect(jsonPath("$.status", is("잠금")));
        mvc.perform(get("/api/audit"))
            .andExpect(jsonPath("$[0].user", is("김현대")));
    }

    @Test
    void auditSortedNewestFirst() throws Exception {
        // ⚠ 시드(최신순 INSERT)와 서버 기록분이 한 목록에 섞인다 — seq DESC 는 시드를
        // 뒤집어 위는 최신순·꼬리는 오래된순인 목록을 내보냈다(2026-08-18 화면 실측).
        // pytest 의 test_audit_sorted_newest_first 와 같은 것을 검사한다(두 벌 정합).
        String body = mvc.perform(get("/api/audit")).andReturn().getResponse().getContentAsString();
        List<String> ats = store.read(body, JsonStore.LIST).stream()
            .map(r -> String.valueOf(r.getOrDefault("at", "")))
            .toList();
        List<String> sorted = ats.stream().sorted(java.util.Comparator.reverseOrder()).toList();
        org.junit.jupiter.api.Assertions.assertEquals(sorted, ats, "감사 로그는 최신부터 내려간다");
    }

    @Test
    void selfLockSubmissionRejected() throws Exception {
        // 자기 잠금 방지는 서버가 최종으로 막는다 — 화면 검사는 한 브라우저 안의 약속
        mvc.perform(post("/api/submissions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"kind\":\"role-change\",\"payload\":{\"roleKey\":\"super\",\"matrix\":{\"권한 관리\":[\"조회\"]}}}"))
            .andExpect(status().isConflict());

        mvc.perform(post("/api/submissions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"kind\":\"role-change\",\"payload\":{\"roleKey\":\"super\",\"matrix\":{\"권한 관리\":[\"조회\",\"수정\"]}}}"))
            .andExpect(jsonPath("$.status", is("접수")));
    }
}
