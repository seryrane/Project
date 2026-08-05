package com.example.backend.api;

import com.example.backend.store.JsonStore;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * RBAC 정본 조회 + 상신 접수.
 *
 * ⚠ 역할 변경을 즉시 반영하는 API 는 일부러 없다 — 권한 변경은 결재를 거친다는
 * 화면 원칙과 같고, 결재 엔진은 미확정이라 접수 사실만 정직하게 남긴다.
 */
@RestController
@RequestMapping("/api")
public class RbacController {

    private final JsonStore store;

    public RbacController(JsonStore store) {
        this.store = store;
    }

    @GetMapping("/roles")
    public List<Map<String, Object>> roles() {
        List<Map<String, Object>> out = store.kvGet("roles", JsonStore.LIST);
        return out == null ? List.of() : out;
    }

    /** 자기 잠금 방지는 서버가 최종으로 막는다 — 화면 검사는 한 브라우저 안의 약속 */
    @PostMapping("/submissions")
    @SuppressWarnings("unchecked")
    public Map<String, Object> submit(@RequestBody Map<String, Object> body) {
        String kind = body.get("kind") == null ? "" : body.get("kind").toString().strip();
        if (kind.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상신 종류(kind)가 없습니다.");
        }

        if ("role-change".equals(kind)) {
            Map<String, Object> payload = (Map<String, Object>) body.getOrDefault("payload", Map.of());
            Map<String, Object> draftMatrix = (Map<String, Object>) payload.getOrDefault("matrix", Map.of());
            Object roleKey = payload.get("roleKey");
            boolean othersManage = roles().stream().anyMatch(r ->
                !r.get("key").equals(roleKey)
                    && ((Number) r.getOrDefault("assigned", 0)).intValue() > 0
                    && ((List<String>) ((Map<String, Object>) r.get("matrix"))
                        .getOrDefault("권한 관리", List.of())).contains("수정"));
            List<String> draftPerm = (List<String>) draftMatrix.getOrDefault("권한 관리", List.of());
            if (!othersManage && !draftPerm.contains("수정")) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "[권한 관리·수정] 보유자가 0명이 됩니다 — 먼저 다른 역할에 부여하세요.");
            }
        }

        Map<String, Object> record = new HashMap<>(body);
        record.put("by", MeController.ME.get("name"));
        Number seq = new SimpleJdbcInsert(store.jdbc())
            .withTableName("submissions")
            .usingGeneratedKeyColumns("seq")
            .executeAndReturnKey(Map.of(
                "kind", kind,
                "json", store.write(record),
                "created_at", LocalDateTime.now().toString()));
        return Map.of("status", "접수", "seq", seq);
    }

    @GetMapping("/submissions")
    public List<Map<String, Object>> submissions() {
        return store.jdbc()
            .queryForList("SELECT seq, kind, json, created_at FROM submissions ORDER BY seq DESC")
            .stream()
            .map(row -> {
                Map<String, Object> out = store.read((String) row.get("json"), JsonStore.MAP);
                out.put("seq", row.get("seq"));
                out.put("kind", row.get("kind"));
                out.put("createdAt", row.get("created_at"));
                return out;
            })
            .toList();
    }
}
