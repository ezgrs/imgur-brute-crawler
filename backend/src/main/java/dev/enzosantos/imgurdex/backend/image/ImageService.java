package dev.enzosantos.imgurdex.backend.image;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ImageService {

    private final ImageRepository imageRepository;

    public ImageService(ImageRepository imageRepository) {
        this.imageRepository = imageRepository;
    }

    public Page<Image> findAll(Pageable pageable) {
        return imageRepository.findAll(pageable);
    }

    public Image findById(Long id) {
        return imageRepository.findById(id).orElseThrow();
    }

    public Image findRandom() {
        return imageRepository.findRandom().orElseThrow();
    }
}
