To run the processor:

```shell
poetry run faststream run --factory processor.interfaces.faststream:create_app
```

To send an Imgur ID to be processed:

```shell
poetry run faststream publish --factory processor.interfaces.faststream:create_app "{\"image_id\": \"0mtwnhm\"}" --exchange events --routing-key "image.requested"
```
