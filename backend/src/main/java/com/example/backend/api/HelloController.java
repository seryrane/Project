package com.example.backend.api;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HelloController {

    @GetMapping("/hello")
    public Map<String, String> hello() {
        return Map.of("message", "Hello from Spring Boot");
    }

    /** FastAPI 벌과 같은 자리 — 프런트·터널 헬스체크가 벌을 가리지 않게 */
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

}
