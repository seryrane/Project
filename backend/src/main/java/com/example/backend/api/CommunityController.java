package com.example.backend.api;

import com.example.backend.store.JsonStore;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
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
 * 커뮤니티 — 공지·Q&A·FAQ. 최소 메뉴(모든 역할)라 조회에 권한을 걸지 않는다.
 * 쓰기 권한 검사는 인증(SSO) 확정 시 함께 건다 — 지금 사용자는 Super Admin 고정.
 */
@RestController
@RequestMapping("/api")
public class CommunityController {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy.MM.dd");

    private final JsonStore store;

    public CommunityController(JsonStore store) {
        this.store = store;
    }

    // ── 공지 ────────────────────────────────────────────────────────
    @GetMapping("/notices")
    public List<Map<String, Object>> notices() {
        return rows("SELECT json FROM notices ORDER BY id DESC");
    }

    @PostMapping("/notices")
    public Map<String, Object> createNotice(@RequestBody Map<String, Object> body) {
        String title = str(body.get("title"));
        if (title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "제목을 입력해 주세요.");
        }
        Integer count = store.jdbc().queryForObject("SELECT COUNT(*) FROM notices", Integer.class);
        Map<String, Object> notice = new HashMap<>();
        notice.put("id", "N-%03d".formatted((count == null ? 0 : count) + 100));
        notice.put("title", title);
        notice.put("category", body.getOrDefault("category", "시스템"));
        notice.put("author", MeController.ME.get("name"));
        notice.put("date", LocalDate.now().format(DAY));
        notice.put("views", 0);
        notice.put("pinned", Boolean.TRUE.equals(body.get("pinned")));
        notice.put("body", Arrays.stream(str(body.get("body")).split("\n"))
            .filter(p -> !p.isBlank()).toList());
        store.jdbc().update("INSERT INTO notices(id, json, created_at) VALUES(?,?,?)",
            notice.get("id"), store.write(notice), LocalDateTime.now().toString());
        return notice;
    }

    // ── Q&A ─────────────────────────────────────────────────────────
    @GetMapping("/questions")
    public List<Map<String, Object>> questions() {
        return rows("SELECT json FROM questions ORDER BY id DESC");
    }

    @PostMapping("/questions")
    public Map<String, Object> createQuestion(@RequestBody Map<String, Object> body) {
        String title = str(body.get("title"));
        if (title.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "제목을 입력해 주세요.");
        }
        Integer count = store.jdbc().queryForObject("SELECT COUNT(*) FROM questions", Integer.class);
        Map<String, Object> question = new HashMap<>();
        question.put("id", "Q-%03d".formatted((count == null ? 0 : count) + 100));
        question.put("title", title);
        question.put("category", body.getOrDefault("category", "기타"));
        question.put("author", MeController.ME.get("name"));
        question.put("date", LocalDate.now().format(DAY));
        question.put("body", str(body.get("body")));
        question.put("answers", List.of());
        store.jdbc().update("INSERT INTO questions(id, json, created_at) VALUES(?,?,?)",
            question.get("id"), store.write(question), LocalDateTime.now().toString());
        return question;
    }

    @PostMapping("/questions/{qid}/answers")
    @SuppressWarnings("unchecked")
    public Map<String, Object> addAnswer(@PathVariable String qid, @RequestBody Map<String, Object> body) {
        String text = str(body.get("body"));
        if (text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "답변 내용을 입력해 주세요.");
        }
        List<String> found = store.jdbc()
            .queryForList("SELECT json FROM questions WHERE id = ?", String.class, qid);
        if (found.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "질문이 없습니다.");
        }
        Map<String, Object> question = store.read(found.get(0), JsonStore.MAP);
        List<Map<String, Object>> answers = new ArrayList<>((List<Map<String, Object>>) question.get("answers"));
        answers.add(Map.of(
            "author", MeController.ME.get("name"),
            "role", "Super Admin",
            "date", LocalDate.now().format(DAY),
            "body", text));
        question.put("answers", answers);
        store.jdbc().update("UPDATE questions SET json = ? WHERE id = ?", store.write(question), qid);
        return question;
    }

    // ── FAQ ─────────────────────────────────────────────────────────
    @GetMapping("/faqs")
    public List<Map<String, Object>> faqs() {
        List<Map<String, Object>> out = store.kvGet("faqs", JsonStore.LIST);
        return out == null ? List.of() : out;
    }

    @PostMapping("/faqs")
    public Map<String, Object> createFaq(@RequestBody Map<String, Object> body) {
        String q = str(body.get("q"));
        String a = str(body.get("a"));
        if (q.isBlank() || a.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "질문과 답변을 모두 입력해 주세요.");
        }
        List<Map<String, Object>> items = new ArrayList<>(faqs());
        Map<String, Object> faq = Map.of(
            "id", "F-%02d".formatted(items.size() + 1),
            "category", body.getOrDefault("category", "계정·권한"),
            "q", q, "a", a, "helpful", 0);
        items.add(faq);
        store.kvPut("faqs", items);
        return faq;
    }

    @PostMapping("/faqs/{fid}/helpful")
    public Map<String, Object> markHelpful(@PathVariable String fid) {
        List<Map<String, Object>> items = new ArrayList<>(faqs());
        Map<String, Object> bumped = null;
        for (int i = 0; i < items.size(); i++) {
            if (fid.equals(items.get(i).get("id"))) {
                Map<String, Object> next = new HashMap<>(items.get(i));
                next.put("helpful", ((Number) next.get("helpful")).intValue() + 1);
                items.set(i, next);
                bumped = next;
            }
        }
        if (bumped == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "FAQ 가 없습니다.");
        }
        store.kvPut("faqs", items);
        return bumped;
    }

    // ── 새 기능 (whatsnew — 규약 19절 정본) ──────────────────────────
    @GetMapping("/whatsnew")
    public List<Map<String, Object>> whatsnew() {
        List<Map<String, Object>> out = store.kvGet("whatsnew", JsonStore.LIST);
        return out == null ? List.of() : out;
    }

    private List<Map<String, Object>> rows(String sql) {
        return store.jdbc().queryForList(sql, String.class).stream()
            .map(j -> store.read(j, JsonStore.MAP))
            .toList();
    }

    private static String str(Object value) {
        return value == null ? "" : value.toString().strip();
    }
}
