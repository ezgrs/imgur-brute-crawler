package dev.enzosantos.imgurdex.backend.image.mapper;

import dev.enzosantos.imgurdex.backend.image.Image;
import dev.enzosantos.imgurdex.backend.image.dto.ImageResponse;
import org.springframework.stereotype.Component;

@Component
public class ImageMapper {

    public ImageResponse toResponse(Image image) {
        return new ImageResponse(image.getId(), image.getWidth(), image.getHeight(), image.getMimeType());
    }
}
