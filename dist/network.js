// Cookies stay HttpOnly on the server's own origin. No password/session storage.
export class ServerConnection {
  constructor() {
    this.queue = Promise.resolve();
    this.pending = 0;
  }
  request(path, body, options = {}) {
    this.pending++;
    const task = this.queue
      .catch(() => {})
      .then(async () => {
        const controller = new AbortController(),
          timer = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch("/api/" + path, {
            method: body === undefined ? "GET" : "POST",
            credentials: "same-origin",
            keepalive: options.keepalive === true,
            headers:
              body === undefined ? {} : { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
            cache: "no-store",
            signal: controller.signal,
          });
          const value = await response.json();
          if (!response.ok)
            throw Object.assign(
              Error(value.error || "Server request failed."),
              { status: response.status, position: value.position },
            );
          return value;
        } finally {
          clearTimeout(timer);
        }
      });
    this.queue = task;
    return task.finally(() => this.pending--);
  }
}
