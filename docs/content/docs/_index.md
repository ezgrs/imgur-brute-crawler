# Introduction

## What is Imgurdex?

Imgur is one of those places where you can spend ten minutes looking for one specific thing and somehow end up looking at a photo of someone's lunch from 2017.

There is a lot of stuff in there. Photos, memes, screenshots, drawings, diagrams, cats, old internet artifacts, things people uploaded once and never thought about again. Most of it will never cross your path, and that's probably what makes it interesting.

Imgurdex is a small experiment built around that idea: **keep looking and see what turns up.**

It periodically searches for images, keeps the ones it finds, and gradually builds an archive of whatever happened to be there when it looked.

There is no curator deciding what's worth saving. There is no grand catalog of the internet. Imgurdex just keeps showing up.

## Why would anyone keep looking?

The fun part is that Imgurdex doesn't really know what it's going to find.

A request might lead nowhere. It might find something completely ordinary. Or it might uncover something so oddly specific that you start wondering who uploaded it, why they uploaded it, and why you are now responsible for preserving it.

That's the charm of the archive. You aren't starting with a collection and deciding what belongs in it. You're letting the collection emerge from the things you happen to encounter.

It is less like building a museum and more like walking around a very large flea market where every box is labeled with seven random characters.

## What happens when something turns up?

Once an image turns up, Imgurdex takes care of the boring parts.

The original is stored, a lightweight thumbnail can be generated, useful metadata is extracted, and a notification can be sent. These operations happen independently, so one image can quietly make its way through several parts of the system without everything having to know everything else.

This is where the project stops being just an image collector and becomes a small distributed system.

## Why does finding an image need a whole system?

Because there is something satisfying about giving every part of the system one job and letting it mind its own business.

The scheduler doesn't need to know how an image is downloaded. The downloader doesn't need to care about thumbnails. The metadata processor doesn't need to know anything about email. They communicate through events, use shared storage where appropriate, and otherwise stay out of each other's way.

It also makes the project a nice place to experiment with message queues, object storage, persistence, failures, retries, and services written in completely different languages.

And when something breaks, you get to find out which little piece of the machine decided to have a bad day.

## What could the archive become?

That's the question worth leaving open.

After a while, the archive becomes a collection of things you didn't explicitly ask for. You can start looking at it as data and asking questions that weren't particularly interesting when you started.

How many images did you find? How many requests led nowhere? How much storage did the archive consume? How often did the same image appear? What dimensions are most common? What does a random collection of images look like after running for a month?

You might discover patterns.

You might discover absolutely nothing.

You will probably discover at least one image that makes you say, *"Why did someone upload this?"*

## What happens after you leave it running?

Imgurdex isn't trying to mirror Imgur, and it certainly isn't trying to archive the entire internet. That would be a considerably less humble project.

It simply keeps a record of what it encounters.

The archive grows over time, and because nobody knows exactly what will be found next, the result is a little different every time you run it.

You give it somewhere to run and let it do its thing.

Eventually, you have an archive of things you didn't know you were going to find.

## What is actually going on under the hood?

Everything runs as a Docker Compose project, so getting the whole system running doesn't require assembling a small datacenter in your living room.

Underneath the discovery aspect, Imgurdex is deliberately straightforward: small services, events between them, object storage for images, and a database for metadata.

You can run it as an image archive, use it to learn about event-driven systems, experiment with the individual services, or take the whole thing apart and see how it works.

The original question was simple:

**What happens if you just keep looking?**

Imgurdex is the answer, one image at a time.
