package com.example.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

// ⚠ test 프로필(H2 mem) 필수 — 기본 프로필은 H2 파일 DB 라, 서버가 떠 있으면
// 파일 잠금 충돌로 컨텍스트가 안 뜬다(실측). 테스트가 개발 DB 를 만지는 것도 막는다.
@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {

    @Test
    void contextLoads() {
    }

}
