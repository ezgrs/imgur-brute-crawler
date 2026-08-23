---
layout: landing
---

<div class="book-hero">

# imgurdex {anchor=false}

It keeps looking.

Every so often, Imgurdex picks a random Imgur image ID and goes to see if there's anything there.

When it finds something, it keeps it, processes it, records what it knows about it, and tells you about it (if you've asked it to).

That's pretty much the whole idea.

{{<button href="/docs/">}}See how it works{{</button>}}

</div>

{{% columns %}}

* ## It doesn't know what it'll find

  Imgurdex doesn't start with a list of interesting images. It starts with a question: *does this ID lead anywhere?*
  Most of the time, maybe not. Every now and then, something turns up.

* ## When it finds something, it keeps it

  Found images become part of the archive. The original is stored separately from everything that happens to it afterward, so the archive keeps the actual thing that was discovered.

* ## One discovery, several reactions

  An image being saved is enough to wake up the rest of the system. A thumbnail can be made, metadata can be recorded, and an email can be sent; all independently.

{{% /columns %}}

{{% columns %}}

* ## Small services, small jobs

  Imgurdex is split into a handful of services, each responsible for one part of the journey. They communicate through events instead of spending their lives calling each other directly.

* ## The archive keeps a record

  The images themselves live in object storage, while their metadata lives separately in a database. The files and the information about those files don't have to share the same home.

* ## It just keeps going

  There's no finish line and no grand collection to complete. Imgurdex keeps looking, and the archive gradually becomes a record of whatever happened to be there when it looked.

{{% /columns %}}
