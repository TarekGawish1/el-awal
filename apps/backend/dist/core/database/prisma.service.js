"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        super({
            log: [
                { emit: 'event', level: 'info' },
                { emit: 'event', level: 'warn' },
                { emit: 'event', level: 'error' },
            ],
        });
        this.logger = new common_1.Logger(PrismaService_1.name);
        this.$on('info', (e) => {
            this.logger.debug(e.message);
        });
        this.$on('warn', (e) => {
            this.logger.warn(e.message);
        });
        this.$on('error', (e) => {
            if (e.message?.includes('kind: Closed') ||
                e.message?.includes('Connection closed') ||
                e.message?.includes('Server closed the connection')) {
                this.logger.debug(`[Neon Serverless] Inactive idle connection closed by pooler. Prisma will auto-reconnect on demand.`);
                return;
            }
            this.logger.error(`Database error: ${e.message}`);
        });
    }
    async onModuleInit() {
        this.logger.log('Connecting to PostgreSQL Database...');
        try {
            await this.$connect();
            this.logger.log('✅ PostgreSQL connection successfully established.');
        }
        catch (error) {
            this.logger.error('❌ Failed to connect to PostgreSQL database:', error);
            throw error;
        }
    }
    async onModuleDestroy() {
        this.logger.log('Disconnecting from PostgreSQL Database...');
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map