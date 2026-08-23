package dev.enzosantos.imgurdex.backend.image;

import dev.enzosantos.imgurdex.backend.image.dto.ImageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/images")
public class ImageController {

    private final ImageService imageService;

    public ImageController(ImageService imageService) {
        this.imageService = imageService;
    }

    @GetMapping
    public Page<ImageResponse> getImages(Pageable pageable) {
        return imageService.findAll(pageable);
    }

    @GetMapping("/{id}")
    public ImageResponse getImage(@PathVariable Long id) {
        return imageService.findById(id);
    }

    @GetMapping("/random")
    public ImageResponse getRandomImage() {
        return imageService.findRandom();
    }
}
