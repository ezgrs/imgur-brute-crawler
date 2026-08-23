# Frontend

The web application for Imgurdex.

It provides a responsive gallery for browsing, viewing, downloading, and linking images. Built with React, TypeScript, and Vite, because apparently displaying pictures required an entire software ecosystem.

There are thumbnails, pagination, random images, keyboard navigation, downloads, direct links, and enough UI polish to make it look like someone knew what they were doing.

## Screenshots

<img width="2560" height="1600" alt="192 168 18 34_(Nest Hub Max)" src="https://github.com/user-attachments/assets/c67c6e75-2db5-45ad-8f60-4b28c1db0c4e" />
<img width="2560" height="1600" alt="192 168 18 34_(Nest Hub Max) (1)" src="https://github.com/user-attachments/assets/6095044a-5e2e-43af-a01a-2c92cf6f0d54" />
<img width="2560" height="1600" alt="192 168 18 34_(Nest Hub Max) (2)" src="https://github.com/user-attachments/assets/4cafa9d3-fb7f-421e-a579-e3c998927adb" />

<sub>These are my images, collected through Imgurdex over the years. I’d happily hand them over to you lot, but hosting the damn things costs money, and I am, regrettably, a poor guy with a database full of whatever the RNG threw at me.</sub>

## Prerequisites

### Node.js

The project requires **Node.js**.

Install dependencies with:

```bash
npm install
```

That's it. No ritual sacrifice. No twelve-step ceremony. `npm install` and we move on with our lives.

## Dependencies

The application is built with:

* **React 19**: making buttons react since 2013.
* **TypeScript**: because discovering problems before production is considered good manners.
* **Vite**: fast development tooling, with considerably less drama than its name suggests.
* **Tailwind CSS**: CSS, except the class names have unionised.
* **shadcn/ui**: reusable UI components without the feeling of having rented your entire frontend from a corporation.
* **Lucide React**: icons, because drawing an arrow yourself would be an irresponsible use of engineering time.
* **ESLint**: the little voice in the room asking what the hell you just did.

See `package.json` for the complete dependency list. If you're the sort of person who reads dependency manifests recreationally, you'll find plenty to enjoy.

## Build

Build the application with:

```bash
npm run build
```

The production build is generated in *dist/*.

To preview the production build:

```bash
npm run preview
```

The build runs TypeScript and Vite. First the compiler checks whether your code has any embarrassing opinions about types; then Vite turns the survivors into a website.

## Development

Start the development server with:

```bash
npm run dev
```

The frontend expects the backend API and MinIO to be available through:

```text
/api
/minio
```

The backend provides image metadata and pagination. MinIO provides the actual pixels.

A sensible division of labour. The backend knows *about* the pictures; MinIO knows where the pictures are. Nobody asks the frontend to store anything, because we've all suffered enough.

The application supports browsing, pagination, random images, full-size previews, downloads, direct links, and keyboard navigation. The source code contains the details. This README has better things to do.

## Formatting

Run ESLint with:

```bash
npm run lint
```

Build and lint before committing:

```bash
npm run lint
npm run build
```

If both pass, congratulations: the machine has found nothing to complain about.

This does **not** mean the code is perfect.

It means the machines have temporarily lost the argument.
