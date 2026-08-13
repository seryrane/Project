package com.example.backend.api;

import com.example.backend.store.JsonStore;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 내 정보 파생 API — 메뉴·기능·권한은 전부 역할 정본에서 파생된다.
 *
 * ⚠ 인증(HMG-SSO)은 미확정이라 사용자를 김현대(u-01, Super Admin)로 고정한다.
 * 프런트가 권한을 다시 판단하지 않도록 서버가 걸러서 준다 — docs/RBAC_설계노트.md 2절.
 */
@RestController
@RequestMapping("/api")
public class MeController {

    public static final Map<String, Object> ME = Map.of(
        "id", "u-01",
        "name", "김현대",
        "email", "hyundae.kim@hmg.com",
        "title", "시스템 관리자",
        "gradeKey", "super");

    private final JsonStore store;

    public MeController(JsonStore store) {
        this.store = store;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> myRole() {
        List<Map<String, Object>> roles = store.kvGet("roles", JsonStore.LIST);
        return roles.stream()
            .filter(r -> ME.get("gradeKey").equals(r.get("key")))
            .findFirst()
            .orElseThrow();
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        Map<String, Object> out = new HashMap<>(ME);
        out.put("gradeName", myRole().get("name"));
        return out;
    }

    /**
     * LNB — 권한 없는 항목은 아예 안 내려간다(눌러서 "권한 없음"은 나쁜 화면).
     * requires 가 없는 항목은 최소 메뉴 — 모든 역할에 보인다. 빈 섹션은 안 내려간다.
     */
    @GetMapping("/me/menu")
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> myMenu() {
        List<Map<String, Object>> nav = store.kvGet("nav", JsonStore.LIST);
        Map<String, Object> requires = store.kvGet("nav_requires", JsonStore.MAP);

        List<Map<String, Object>> sections = new ArrayList<>();
        for (Map<String, Object> section : nav) {
            List<Map<String, Object>> items = new ArrayList<>();
            for (Map<String, Object> item : (List<Map<String, Object>>) section.get("items")) {
                String key = (String) item.get("key");
                // requires 가 없는 항목은 최소 메뉴 — 모든 역할에 보인다
                if (!requires.containsKey(key) || canView((String) requires.get(key))) {
                    items.add(item);
                }
            }
            if (!items.isEmpty()) {
                Map<String, Object> out = new HashMap<>(section);
                out.put("items", items);
                sections.add(out);
            }
        }
        return sections;
    }

    /**
     * 이 역할이 그 메뉴를 조회할 수 있나. `/me/menu` 가 항목을 거르는 그 판단이다 —
     * 다른 목록도 같은 저울을 써야 화면마다 다른 답이 나오지 않는다.
     */
    @SuppressWarnings("unchecked")
    public boolean canView(String menu) {
        Map<String, Object> matrix = (Map<String, Object>) myRole().get("matrix");
        return ((List<String>) matrix.getOrDefault(menu, List.of())).contains("조회");
    }

    /**
     * 사양서 **카탈로그**(이름 축) — 본문이 아니라 목록이다.
     *
     * ⚠⚠ 이걸 서버로 올린 이유는 본문이 필요해서가 아니라 **이름이 새기 때문**이다.
     * ⌘K 팔레트가 정적 목록을 읽고 있어서, 사양서 관리 조회 권한이 없는 사람에게도
     * 사양서 이름이 그대로 떴다. 눌러서 막히는 게 아니라 **있는지조차 몰라야 할 것의
     * 이름이 보이는 것**이 문제다 — LNB 와 같은 이유로 여기도 서버가 거른다.
     * 못 보는 사람에게는 **빈 목록**이다(403 이 아니다 — 없는 것과 막힌 것을 가른다).
     */
    @GetMapping("/specs")
    public List<Map<String, Object>> specs() {
        if (!canView("사양서 관리")) {
            return List.of();
        }
        List<Map<String, Object>> out = store.kvGet("specs", JsonStore.LIST);
        return out == null ? List.of() : out;
    }

    /** 대시보드 위젯 프리셋 파생용 — 역할에 기능이 붙고 떨어지면 프리셋도 따라간다 */
    @GetMapping("/me/features")
    @SuppressWarnings("unchecked")
    public List<String> myFeatures() {
        return (List<String>) myRole().get("features");
    }

    /** 내가 할 수 있는 것 — 권한은 말없이 붙으므로 받은 본인이 확인할 자리 */
    @GetMapping("/me/abilities")
    @SuppressWarnings("unchecked")
    public Map<String, Object> myAbilities() {
        Map<String, Object> role = myRole();
        Map<String, Object> matrix = (Map<String, Object>) role.get("matrix");
        Map<String, Object> scope = (Map<String, Object>) role.getOrDefault("scope", Map.of());

        List<Map<String, Object>> menus = new ArrayList<>();
        for (Map.Entry<String, Object> entry : matrix.entrySet()) {
            List<String> actions = (List<String>) entry.getValue();
            if (actions.isEmpty()) {
                continue;
            }
            menus.add(Map.of(
                "menu", entry.getKey(),
                "actions", actions,
                "scope", scope.getOrDefault(entry.getKey(), "all")));
        }
        return Map.of("roles", List.of(role.get("name")), "menus", menus);
    }

    /** 위젯 배치 — 계정 단위 저장(브라우저 저장의 "다른 PC 에서 초기화" 문제를 푼다) */
    @GetMapping("/me/dashboard-layout")
    public Map<String, Object> getLayout() {
        Object layout = store.kvGet("layout:" + ME.get("id"),
            new tools.jackson.core.type.TypeReference<Object>() {});
        Map<String, Object> out = new HashMap<>();
        out.put("layout", layout);
        return out;
    }

    @PutMapping("/me/dashboard-layout")
    public Map<String, String> putLayout(@RequestBody Map<String, Object> body) {
        store.kvPut("layout:" + ME.get("id"), body.getOrDefault("layout", List.of()));
        return Map.of("status", "ok");
    }
}
