package com.example.backend.api;

import com.example.backend.store.JsonStore;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * 회원·감사 로그 — 잠금/해제는 되돌릴 수 있으므로 즉시 반영한다.
 * 잠금 처리 사실은 화면이 아니라 서버가 감사 로그로 남긴다(화면만 남기면 빠뜨린다).
 */
@RestController
@RequestMapping("/api")
public class DirectoryController {

    private static final DateTimeFormatter MINUTE = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");

    private final JsonStore store;

    public DirectoryController(JsonStore store) {
        this.store = store;
    }

    @GetMapping("/members")
    public List<Map<String, Object>> members() {
        List<Map<String, Object>> out = store.kvGet("members", JsonStore.LIST);
        return out == null ? List.of() : out;
    }

    @PostMapping("/members/{mid}/lock-toggle")
    public Map<String, Object> toggleLock(@PathVariable String mid) {
        List<Map<String, Object>> items = new ArrayList<>(members());
        Map<String, Object> toggled = null;
        for (int i = 0; i < items.size(); i++) {
            if (mid.equals(items.get(i).get("id"))) {
                Map<String, Object> next = new HashMap<>(items.get(i));
                next.put("status", "잠금".equals(next.get("status")) ? "활성" : "잠금");
                items.set(i, next);
                toggled = next;
            }
        }
        if (toggled == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "회원이 없습니다.");
        }
        store.kvPut("members", items);
        addAudit(Map.of(
            "action", "활성".equals(toggled.get("status")) ? "열람" : "마스킹 해제",
            "target", toggled.get("name") + " 계정 " + toggled.get("status"),
            "reason", "회원 관리 화면에서 처리"));
        return toggled;
    }

    // ── 감사 로그 ────────────────────────────────────────────────────
    private void addAudit(Map<String, Object> entry) {
        Map<String, Object> record = new HashMap<>(entry);
        record.put("at", LocalDateTime.now().format(MINUTE));
        record.put("user", MeController.ME.get("name"));
        store.jdbc().update("INSERT INTO audit_log(json) VALUES(?)", store.write(record));
    }

    @GetMapping("/audit")
    public List<Map<String, Object>> audit() {
        // ⚠ 정렬은 **시각**으로 한다 (규약 §9: 시간 축은 시간순) — backend-python 과 같은 수정.
        //   시드는 화면 표시 순서(최신부터)로 INSERT 되어 seq DESC 가 그걸 뒤집었다:
        //   서버 기록분(최신순) 뒤에 시드(오래된순)가 이어 붙어 나갔다(2026-08-18 실측).
        //   `at`("2026.08.05 09:41")는 0 채움 고정 포맷이라 문자열 비교가 곧 시간 비교다.
        //   같은 시각은 나중에 기록된 것(seq 큰 것)이 위 — 기록 순서가 두 번째 축이다.
        record Row(long seq, Map<String, Object> rec) {}
        return store.jdbc()
            .query("SELECT seq, json FROM audit_log",
                (rs, i) -> new Row(rs.getLong("seq"), store.read(rs.getString("json"), JsonStore.MAP)))
            .stream()
            .sorted(java.util.Comparator
                .comparing((Row r) -> String.valueOf(r.rec().getOrDefault("at", "")))
                .thenComparingLong(Row::seq)
                .reversed())
            .map(Row::rec)
            .toList();
    }

    /** 다운로드 등 반출 행위를 화면이 알린다 — 사유는 필수(처리방침 제4조) */
    @PostMapping("/audit")
    public Map<String, String> recordAudit(@RequestBody Map<String, Object> body) {
        String reason = body.get("reason") == null ? "" : body.get("reason").toString().strip();
        if (reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사유를 입력해 주세요.");
        }
        addAudit(Map.of(
            "action", body.getOrDefault("action", "다운로드"),
            "target", body.getOrDefault("target", "").toString(),
            "reason", reason));
        return Map.of("status", "ok");
    }
}
