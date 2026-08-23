package dev.enzosantos.imgurdex.backend.image;

import dev.enzosantos.imgurdex.backend.image.dto.ImageResponse;
import dev.enzosantos.imgurdex.backend.image.mapper.ImageMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ImageService {

    private final ImageRepository imageRepository;
    private final ImageMapper imageMapper;

    public ImageService(ImageRepository imageRepository, ImageMapper imageMapper) {
        this.imageRepository = imageRepository;
        this.imageMapper = imageMapper;
    }

    public Page<ImageResponse> findAll(Pageable pageable) {
        final Page<Image> images = imageRepository.findAll(pageable);
        return images.map(imageMapper::toResponse);
    }

    public ImageResponse findById(String id) {
        return imageRepository.findById(id).map(imageMapper::toResponse).orElseThrow();
    }

    public ImageResponse findRandom() {
        return imageRepository.findRandom().map(imageMapper::toResponse).orElseThrow();
    }
}
