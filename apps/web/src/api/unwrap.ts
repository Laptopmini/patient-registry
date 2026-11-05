/**
 * The generated client types every response as a union of success and error shapes. Our
 * mutator (`http.ts`) throws for non-2xx responses, so by the time a result reaches
 * application code it is always a success. This narrows the type and returns the body.
 */
type Success = 200 | 201 | 204;

export const unwrap = <R extends { status: number; data: unknown }>(
  response: R,
): Extract<R, { status: Success }>['data'] =>
  response.data as Extract<R, { status: Success }>['data'];
