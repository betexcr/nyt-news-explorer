import axios from "axios";

export interface GraphqlRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function graphqlRequest<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, any>,
  options?: GraphqlRequestOptions
): Promise<T> {
  const url = (endpoint || "").trim();
  if (!url) throw new Error("GraphQL endpoint URL is not configured");

  const response = await axios.post(
    url,
    { query, variables },
    {
      signal: options?.signal,
      timeout: options?.timeoutMs,
      headers: { "content-type": "application/json" },
    }
  );

  const data = response?.data;
  if (data?.errors?.length) {
    const message = data.errors.map((e: any) => e.message).join("; ");
    throw new Error(message || "GraphQL request failed");
  }

  return data.data as T;
}


