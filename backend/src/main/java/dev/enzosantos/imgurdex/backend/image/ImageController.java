package dev.enzosantos.imgurdex.backend.image;

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
    public Page<Image> getImages(Pageable pageable) {
        return imageService.findAll(pageable);
    }

    @GetMapping("/{id}")
    public Image getImage(@PathVariable Long id) {
        return imageService.findById(id);
    }

    @GetMapping("/random")
    public Image getRandomImage() {
        return imageService.findRandom();
    }
}
