package dev.enzosantos.imgurdex.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI imageApiOpenAPI() {
        return new OpenAPI()
                .info(new Info().title("Imgurdex's Backend").version("0.1.0").description("API for querying images"));
    }
}
