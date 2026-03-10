import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend-base-url";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
// TODO: update cache type
type Cache = "force-cache" | "no-store";
type Revalidate = false | 0 | number;
type Tags = string[];

type FetchOptions = {
  method: HttpMethod;
  headers: HeadersInit;
  body?: any;
  cache?: Cache;
  next?: {
    revalidate?: Revalidate;
    tags?: Tags;
  };
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function fetchWrapper(
  url: string,
  method: HttpMethod,
  body?: any,
  cache?: Cache,
  revalidate?: Revalidate,
  tags?: Tags
) {
  const baseUrl = getBackendBaseUrl();
  const authToken = cookies().get("__shc_access_token")?.value;
  const options: FetchOptions = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    } as HeadersInit,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  if (cache) {
    options.cache = cache;
  }

  if (revalidate || tags) {
    options.next = {};
    if (revalidate !== undefined) {
      options.next.revalidate = revalidate;
    }
    if (tags) {
      options.next.tags = tags;
    }
  }

  let response: Response;

  try {
    response = await fetch(
      `${baseUrl}${url.startsWith("/") ? url : `/${url}`}`,
      options
    );
  } catch (error) {
    throw new ApiError(
      error instanceof Error
        ? `Unable to reach the backend at ${baseUrl}`
        : "Unable to reach the backend",
      503
    );
  }

  if (!response.ok) {
    throw new ApiError(
      // TODO: get pretty error message from backend and display them as it is.
      (await response.text()) ||
        `Failed to fetch ${url} with status ${response.status}`,
      response.status
    );
  }

  return response.json();
}

export namespace api {
  export const get = (
    url: string,
    cache?: Cache,
    revalidate?: Revalidate,
    tags?: string[]
  ) => fetchWrapper(url, "GET", undefined, cache, revalidate, tags);

  export const post = (
    url: string,
    body: any,
    cache?: Cache,
    revalidate?: Revalidate,
    tags?: string[]
  ) => fetchWrapper(url, "POST", body, cache, revalidate, tags);

  export const patch = (
    url: string,
    body: any,
    cache?: Cache,
    revalidate?: Revalidate,
    tags?: string[]
  ) => fetchWrapper(url, "PATCH", body, cache, revalidate, tags);

  export const put = (
    url: string,
    body: any,
    cache?: Cache,
    revalidate?: Revalidate,
    tags?: string[]
  ) => fetchWrapper(url, "PUT", body, cache, revalidate, tags);

  export const del = (
    url: string,
    cache?: Cache,
    revalidate?: Revalidate,
    tags?: string[]
  ) => fetchWrapper(url, "DELETE", undefined, cache, revalidate, tags);
}
