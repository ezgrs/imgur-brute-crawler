

<div align="center">

# imgurdex

</div>

<div align="center">
<p>
  <strong>Looking for the code?</strong><br>
  You're already here.
</p>

<p>
  <strong>Looking for the explanation?</strong><br>
  <a href="https://ezgrs.github.io/imgurdex">Read the documentation →</a>
</p>

<p>
  <strong>Looking for what Imgurdex found?</strong><br>
  Well, that's the whole f*cking point.
</p>

</div>



Imgurdex is a small, open-source archive that periodically looks for images on Imgur and keeps the ones it happens to find.

That's the idea.

The rest is a handful of services that react to those discoveries, process the images, record what they know about them, and occasionally bother you by email.

<div align="center">

**5** services &nbsp; · &nbsp;
**5** languages &nbsp; · &nbsp;
**2** events &nbsp; · &nbsp;
**1** questionable idea

</div>

<div align="center">
  
| Service | Language | Job |
|---|---|---|
| **Scheduler** | Go | Decides when to look. |
| **Fetcher** | Rust | Knocks on Imgur's door. |
| **Thumbnail Processor** | Python | Makes small versions of what was found. |
| **Metadata Processor** | Dart | Writes down what it knows. |
| **Notifier** | Kotlin | Tells you when something turns up. |

</div>

### Why keep looking?

Because you never know what the next ID is hiding.

Maybe it's a stupid cat someone uploaded at 3 AM. Maybe it's a dog looking directly into the camera like it has a mortgage and a court date. Maybe it's a screenshot of some obscure Russian system you've never heard of, a game you've never played, or a piece of internet history that somebody apparently decided was worth keeping forever.

And yes, you'll find a **lot** of GTA San Andreas Multiplayer screenshots. You can't escape them.

Every now and then, there might even be something you absolutely weren't expecting to find. That's the charm of an archive built without a destination: no curated collection, no grand plan, no idea what comes next.

Just another random ID.

**Look again.**


<div align="center">

<table>
<tr>
<td width="33%" align="center">

🔎<br>
**Keeps Looking**<br>
Randomly checks Imgur IDs and sees what turns up.

</td>

<td width="33%" align="center">

💾<br>
**Keeps Finds**<br>
Images that exist become part of the archive.

</td>

<td width="33%" align="center">

⚙️<br>
**Keeps Working**<br>
Found images can be processed independently.

</td>
</tr>

<tr>
<td width="33%" align="center">

🧾<br>
**Keeps Records**<br>
Metadata is stored separately from the images.

</td>

<td width="33%" align="center">

📬<br>
**Can Tell You**<br>
The Notifier can send an email when something turns up.

</td>

<td width="33%" align="center">

❓<br>
**Doesn't Know**<br>
Neither Imgurdex nor you know what's behind the next ID.

</td>
</tr>
</table>

</div>

### Want to see how the machine works?

This README is intentionally small.

The actual documentation lives [here](https://ezgrs.github.io/imgurdex).

Start with the **Getting Started** guide if you want to get the thing running, or jump straight into **Architecture** if you'd rather understand the shape of the system.


<p align="center">
  <strong>It keeps looking.</strong><br>
  <sub>It doesn't know what it'll find. Neither do you.</sub>
</p>
