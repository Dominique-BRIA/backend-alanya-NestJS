export type TokenScope = 'access' | 'refresh' | 'setup';

export interface TokenPayload {
  sub: string; // userId
  scope: TokenScope;
}