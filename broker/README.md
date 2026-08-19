To run the broker:

```shell
poetry run faststream run --factory broker.interfaces.faststream:create_app
```

To send an Imgur ID to be processed:

```shell
poetry run faststream publish --factory broker.interfaces.faststream:create_app "{\"image_id\": \"0mtwnhm\"}" --exchange events --routing-key "image.requested"
```
