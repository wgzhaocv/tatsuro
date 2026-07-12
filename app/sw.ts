/// <reference lib="webworker" />

// Service worker. Bundled by @serwist/turbopack's route handler
// (app/serwist/[path]/route.ts) and served at /serwist/sw.js — Turbopack has
// no webpack plugins, so the official @serwist/next integration doesn't apply
// here. Only audio streams get runtime caching (see sw/audio-cache); pages,
// covers, and static assets already have their own caching stories.

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { audioStreamHandler } from "./sw/audio-cache";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
});

serwist.registerCapture(
  ({ url }) => url.pathname.includes("/stream/new_play"),
  audioStreamHandler,
);

serwist.addEventListeners();
