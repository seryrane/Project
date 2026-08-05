package com.example.backend;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
