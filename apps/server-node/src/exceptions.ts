export class HttpException extends Error {
    public constructor(message: string, public status: number, public code?: string) {
        super(message);
    }
}

export const handleHttpExceptions = (exception: any, log: boolean = true) => {
    log && console.error(exception);

    const state = {
        code: 'INTERNAL_SERVER_ERROR',
        status: 500,
        message: 'Internal Server Error',
    };
    
    if (exception instanceof HttpException) {
        state.message = exception.message;
        state.status = exception.status;
        state.code = exception.code || state.code;
    }

    return state;
};
