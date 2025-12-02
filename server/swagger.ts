import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../package.json';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Roxonn Platform API',
            version,
            description: 'API documentation for the Roxonn Platform',
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
            contact: {
                name: 'Roxonn Support',
                url: 'https://roxonn.com',
                email: 'support@roxonn.com',
            },
        },
        servers: [
            {
                url: '/api',
                description: 'API Server',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'connect.sid',
                },
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                cookieAuth: [],
            },
        ],
    },
    apis: ['./server/routes.ts', './server/routes/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
