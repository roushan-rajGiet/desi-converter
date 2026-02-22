import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any) {
        // Return null for unauthenticated users instead of throwing
        return user || null;
    }
}
