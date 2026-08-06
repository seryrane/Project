package com.example.backend.store;

// Spring Boot 4 는 Jackson 3 — 패키지가 tools.jackson 으로 바뀌었고 예외는 unchecked 다
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 저장 관문 — FastAPI 벌(정본)의 kv+행 구조를 그대로 옮긴다.
 *
 * 정본 문서는 kv 에 JSON 통째로 저장한다 — 부분 갱신 API 를 두면 중간에 실패했을 때
 * 반쯤 바뀐 정본이 남고, 그 상태는 화면에서 안 보인다(docs/RBAC_설계노트.md).
 */
@Component
public class JsonStore {

    /** 자주 쓰는 모양 둘 — 문서(맵)와 문서 목록 */
    public static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};
    public static final TypeReference<List<Map<String, Object>>> LIST = new TypeReference<>() {};

    private final JdbcTemplate jdbc;
    private final ObjectMapper om;

    public JsonStore(JdbcTemplate jdbc, ObjectMapper om) {
        this.jdbc = jdbc;
        this.om = om;
    }

    public JdbcTemplate jdbc() {
        return jdbc;
    }

    public <T> T kvGet(String name, TypeReference<T> type) {
        List<String> rows = jdbc.queryForList("SELECT json FROM kv WHERE name = ?", String.class, name);
        return rows.isEmpty() ? null : read(rows.get(0), type);
    }

    /** 갱신 후 없으면 삽입 — ON CONFLICT 문법이 PG/H2 에서 갈려서 표준 두 문장으로 */
    public void kvPut(String name, Object value) {
        String json = write(value);
        int updated = jdbc.update("UPDATE kv SET json = ? WHERE name = ?", json, name);
        if (updated == 0) {
            jdbc.update("INSERT INTO kv(name, json) VALUES(?, ?)", name, json);
        }
    }

    public <T> T read(String json, TypeReference<T> type) {
        try {
            return om.readValue(json, type);
        } catch (JacksonException e) {
            throw new IllegalStateException("저장된 JSON 을 읽지 못했습니다", e);
        }
    }

    public String write(Object value) {
        try {
            return om.writeValueAsString(value);
        } catch (JacksonException e) {
            throw new IllegalStateException("JSON 으로 적지 못했습니다", e);
        }
    }
}
