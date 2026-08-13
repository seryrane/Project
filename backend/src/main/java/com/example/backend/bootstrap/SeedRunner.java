package com.example.backend.bootstrap;

import com.example.backend.store.JsonStore;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * 시드 — 비어 있을 때만 채운다. 매번 덮으면 화면에서 바꾼 것이 재기동 때마다
 * 되돌아간다(docs/RBAC_설계노트.md 4절).
 *
 * 시드 원본은 FastAPI 벌의 seeds.py 가 정본이고, backend-python/dump_seeds.py 가
 * resources/seed/*.json 으로 덤프한다 — 손으로 두 벌을 적으면 반드시 어긋난다.
 */
@Component
public class SeedRunner implements ApplicationRunner {

    private final JsonStore store;

    public SeedRunner(JsonStore store) {
        this.store = store;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (String name : List.of("roles", "faqs", "members", "whatsnew", "specs")) {
            Integer exists = store.jdbc()
                .queryForObject("SELECT COUNT(*) FROM kv WHERE name = ?", Integer.class, name);
            if (exists == null || exists == 0) {
                store.jdbc().update("INSERT INTO kv(name, json) VALUES(?, ?)", name, readSeed(name));
            }
        }
        // ⚠ nav·nav_requires 는 화면에서 고치는 값이 아니라 **코드가 정본** — 항상 덮는다.
        //   비어 있을 때만 채우면 구조를 바꿔도 기존 DB 가 옛 메뉴를 계속 낸다(FastAPI 벌에서 실증)
        for (String name : List.of("nav", "nav_requires")) {
            String json = readSeed(name);
            int updated = store.jdbc().update("UPDATE kv SET json = ? WHERE name = ?", json, name);
            if (updated == 0) {
                store.jdbc().update("INSERT INTO kv(name, json) VALUES(?, ?)", name, json);
            }
        }
        seedRows("notices");
        seedRows("questions");
        seedAudit();
    }

    private void seedRows(String table) {
        Integer count = store.jdbc().queryForObject("SELECT COUNT(*) FROM " + table, Integer.class);
        if (count != null && count > 0) {
            return;
        }
        List<Map<String, Object>> rows = store.read(readSeed(table), JsonStore.LIST);
        for (Map<String, Object> row : rows) {
            store.jdbc().update(
                "INSERT INTO " + table + "(id, json, created_at) VALUES(?,?,?)",
                row.get("id"), store.write(row), OffsetDateTime.now().toString());
        }
    }

    private void seedAudit() {
        Integer count = store.jdbc().queryForObject("SELECT COUNT(*) FROM audit_log", Integer.class);
        if (count != null && count > 0) {
            return;
        }
        List<Map<String, Object>> rows = store.read(readSeed("audit"), JsonStore.LIST);
        for (Map<String, Object> row : rows) {
            store.jdbc().update("INSERT INTO audit_log(json) VALUES(?)", store.write(row));
        }
    }

    private String readSeed(String name) {
        try {
            return new String(
                new ClassPathResource("seed/" + name + ".json").getInputStream().readAllBytes(),
                StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("시드를 읽지 못했습니다: " + name, e);
        }
    }
}
