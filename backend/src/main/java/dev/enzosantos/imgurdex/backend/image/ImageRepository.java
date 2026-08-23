package dev.enzosantos.imgurdex.backend.image;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ImageRepository extends JpaRepository<Image, Long> {
    @Query(
            value = """
        SELECT *
        FROM images
        ORDER BY RANDOM()
        LIMIT 1
    """,
            nativeQuery = true)
    Optional<Image> findRandom();
}
