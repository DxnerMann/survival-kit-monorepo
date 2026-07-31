package com.survivalkit.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.File;

@SpringBootApplication
@EnableScheduling
public class SurvivalKitApplication {

    public static void main(String[] args) {

        System.out.println("Working dir: " + new File(".").getAbsolutePath());
        SpringApplication.run(SurvivalKitApplication.class, args);
    }

}
