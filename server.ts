import { Application, Router } from "oak/mod.ts";
import { nextId } from "./snowflake.ts";
import "./jwt.ts";

const app = new Application();
const api = new Router();

enum DiscussionGroupType {
    Channel = 1,
    ThreadComment = 2, // Comment
    ThreadGroup = 3, // Chat group
    ThreadOneOnOne = 4, // Chat 1-1
    LiveChat = 5,
    File = 9,
    Rating = 10, // Comment of rating
    ThreadCommunity = 11, // Space
    ThreadPost = 12, // Post
    Other = 100
}

enum AccessMode {
    Public = 1,
    Protected = 2,
    Private = 3,
}

type RecordId = string;
type Gene = string;
const geneLength = 5;

function generateGene(gene?: Gene): Gene {
    if (gene === undefined) {
        return newGene();
    }
    return nextGene(gene);
}
function nextGene(gene: Gene): Gene {
    // split gene into 2 parts, the first part is the parent gene (others), the second part is the child gene (geneLength characters)
    const parentGeneLength = gene.length - geneLength;
    const parentGene = gene.slice(0, parentGeneLength);
    const childGene = gene.slice(parentGeneLength);

    return parentGene.concat(nextHex(childGene));
}
function nextHex(hex: string): string {
    const hexInt = parseInt(hex, 16);
    const nextHexInt = hexInt + 1;
    return nextHexInt.toString(16).padStart(hex.length, "0");
}
function newGene(): Gene {
    return "0".repeat(geneLength);
}
function isChildGene(gene: Gene, parentGene: Gene) {
    return gene.startsWith(parentGene);
}

enum Status {
    CloudDeleted = -10,
    Deleted = -9,
    Reject = -4,
    Cancel = -3, 
    Blocked = -2,
    Draft = -1,
    Inactive = 0,
    Active = 1,
}
interface CommonRecordFields {
    id?: RecordId;
    createTime?: number;
    updateTime?: number;
    createUser?: RecordId | null;
    updateUser?: RecordId | null;
    status?: Status;
}
interface DiscussionGroup extends CommonRecordFields {
    parentId: RecordId;
    referenceTo: RecordId;
    replyTo: RecordId;
    type: DiscussionGroupType;
    name: string;
    gene: Gene;
    description: string;
    accessMode: AccessMode;
}

interface Message extends CommonRecordFields {
    threadId: RecordId;
    userId: RecordId,
    channelId: RecordId,
    content?: string;
    fileId?: RecordId;
    fileUrl?: string;
}

const messages: Message[] = [];

const currentUserId = "123456789012345678";
const currentThreadId = "123456789012345678";
const currentChannelId = "123456789012345678";
const currentReplyTo = "0";

const hasPreviousPage = (page: number) => {
    return page >= 1;
}
const hasNextPage = (page: number, size: number, count: number) => {
    return (page + 1) * size < count;
}
const getTotalPages = (size: number, count: number) => {
    return Math.ceil(count / size);
}

api.get("/messages/get-paged", (ctx) => {
    const requestPage = parseInt(ctx.request.url.searchParams.get('page') || '1');
    const requestSize = parseInt(ctx.request.url.searchParams.get('size') || '10');

    const page = Math.max(0, requestPage - 1);

    const response = {
        items: messages.slice(page * requestSize, (page + 1) * requestSize),
        page: requestPage,
        size: requestSize,
        count: messages.length,
        totalPages: getTotalPages(requestSize, messages.length),
        hasNext: hasNextPage(page, requestSize, messages.length),
        hasPrevious: hasPreviousPage(page),
    }

    ctx.response.body = response;
});
const setInsertParams = (baseEntity: CommonRecordFields, userId?: RecordId) => {
    baseEntity.createTime = Date.now();
    baseEntity.updateTime = Date.now();

    baseEntity.createUser = userId;
    baseEntity.updateUser = userId;

    baseEntity.id = nextId().toString();
    baseEntity.status = Status.Active;
}
const setUpdateParams = (baseEntity: CommonRecordFields, userId?: RecordId) => {
    baseEntity.updateTime = Date.now();
    baseEntity.updateUser = userId;
}

interface MessageCreateRequest {
    content: string;
    threadId: RecordId,
    channelId: RecordId,
    fileId?: RecordId;
    fileUrl?: string;
}

api.post("/messages", async (ctx) => {
    const request = await ctx.request.body.json() as MessageCreateRequest;
    const message: Message = {
        threadId: request.threadId,
        userId: currentUserId,
        channelId: request.channelId,
        content: request.content,
        fileId: request.fileId,
        fileUrl: request.fileUrl,
    };

    setInsertParams(message, currentUserId);

    messages.push(message);
    ctx.response.body = message.id;
})
function notFound(ctx: any) {
    ctx.response.status = 404;
    ctx.response.body = { message: "Not found" };
}
function ok(ctx: any) {
    ctx.response.status = 200;
    ctx.response.body = { message: "OK" };
}

// in controllers
// handleResultAsync => notfound, ok, forbidden, badrequest, internalServerError,...

// in services
// Result.success, Result.error, Result.forbidden, Result.badRequest, Result.internalServerError

api.delete("/messages/:messageId", (ctx) => {
    const messageId = ctx.params.messageId;
    const message = messages.find(m => m.id === messageId);

    if (message) {
        message.status = Status.Deleted;
    }

    return ok(ctx);
})

app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.response.headers.set('X-Response-Time', `${ms}ms`);
})

api.use((ctx, next) => {
    ctx.response.headers.set('Content-Type', 'application/json');
    next();
})

app.use(api.routes())
app.use(api.allowedMethods())

await app.listen({ port: 8000 });