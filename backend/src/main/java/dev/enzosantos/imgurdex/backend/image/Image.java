package dev.enzosantos.imgurdex.backend.image;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "images")
public class Image {
    @Id
    @Column(length = 7, nullable = false)
    private String id;

    @Column(nullable = false)
    private Short width;

    @Column(nullable = false)
    private Short height;

    @Column(nullable = false)
    private Integer size;

    @Column(name = "mime_type", length = 63, nullable = false)
    private String mimeType;

    @Column(length = 64, nullable = false)
    private String hash;

    protected Image() {}

    public Image(String id, Short width, Short height, Integer size, String mimeType, String hash) {
        this.id = id;
        this.width = width;
        this.height = height;
        this.size = size;
        this.mimeType = mimeType;
        this.hash = hash;
    }

    public String getId() {
        return id;
    }

    public Short getWidth() {
        return width;
    }

    public Short getHeight() {
        return height;
    }

    public Integer getSize() {
        return size;
    }

    public String getMimeType() {
        return mimeType;
    }

    public String getHash() {
        return hash;
    }
}
