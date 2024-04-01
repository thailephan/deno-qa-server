import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { nextId } from "./snowflake.ts";

const DateTimeHelpers = {
    now: () => Date.now(),
    unixTimestamp: () => Math.floor(Date.now() / 1000),
}

type TokenType = "access-token" | "refresh-token";
type Token = string;


const secretKey = "secret-key";
const accessTokenExp = 60 * 60 * 24; // 1 day
const refreshTokenExp = 60 * 60 * 24 * 30; // 30 days
const issuer = "server";

const generateRefreshToken = async (data: any) => {
    const now = DateTimeHelpers.unixTimestamp();
    return await create(
        { alg: "HS512", typ: "JWT" },
        {
            exp: now + refreshTokenExp, // 2 days
            iat: now,
            nbf: now,
            jti: nextId().toString(),
            ...data,
        },
        {
            algorithm: {
                name: "HS512",
            },
            type: "secret",
            extractable: true,
            usages: [
                "sign",
                "verify",
            ]
        },
    );
}
const generateAccessToken = async (data: any) => {
    const now = DateTimeHelpers.unixTimestamp();
    return await create(
        { alg: "HS512", typ: "JWT" },
        {
            exp: now + accessTokenExp,
            iss: issuer,
            iat: now,
            nbf: now,
            jti: nextId().toString(),
            ...data,
        },
        {
            algorithm: {
                name: "HS512",
            },
            type: "secret",
            extractable: true,
            usages: [
                "sign",
                "verify",
            ]
        },
    );
}

const generateTokenStrategy: Record<TokenType, (data: any) => Promise<Token>> = {
    "access-token": generateAccessToken,
    "refresh-token": generateRefreshToken,
}

const generateToken = (data: any, type: TokenType): Token | undefined => {
    return generateTokenStrategy[type]?.(data);
}

export { generateToken }