import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse,
  getSchemaPath,
  ApiExtraModels,
  ApiResponseOptions,
} from '@nestjs/swagger';

export interface ApiGlobalResponseOptions {
  status?: 200 | 201;
  description?: string;
  type?: Type<any> | (() => Type<any>) | [Type<any>];
  isArray?: boolean;
  message?: string;
  paginated?: boolean;
}

export function ApiGlobalResponse(options: ApiGlobalResponseOptions = {}) {
  const {
    status = 200,
    description = 'Operación exitosa',
    type,
    isArray = false,
    message = 'Operación realizada con éxito',
    paginated = false,
  } = options;

  const targetType = Array.isArray(type) ? type[0] : type;

  let responseSchema: ApiResponseOptions;

  if (paginated) {
    const dataSchema = targetType
      ? isArray
        ? {
            type: 'array',
            items: { $ref: getSchemaPath(targetType) },
          }
        : { $ref: getSchemaPath(targetType) }
      : { type: 'object', nullable: true };

    const properties: Record<string, any> = {
      message: { type: 'string', example: message },
    };

    if (isArray) {
      properties.total = { type: 'number', example: 10 };
    }

    properties.data = dataSchema;

    responseSchema = {
      schema: {
        type: 'object',
        properties,
      },
      description,
    };
  } else {
    if (targetType) {
      if (isArray) {
        responseSchema = {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string', example: message },
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(targetType) },
              },
            },
          },
          description,
        };
      } else {
        responseSchema = {
          schema: {
            allOf: [
              {
                type: 'object',
                properties: {
                  message: { type: 'string', example: message },
                },
              },
              { $ref: getSchemaPath(targetType) },
            ],
          },
          description,
        };
      }
    } else {
      responseSchema = {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: message },
          },
        },
        description,
      };
    }
  }

  const successDecorator =
    status === 201
      ? ApiCreatedResponse(responseSchema)
      : ApiOkResponse(responseSchema);

  return applyDecorators(
    ...(targetType ? [ApiExtraModels(targetType)] : []),
    successDecorator,
    ApiBadRequestResponse({
      description: 'Solicitud incorrecta',
    }),
    ApiUnauthorizedResponse({
      description: 'No autorizado / Token JWT inválido',
    }),
    ApiNotFoundResponse({ description: 'Recurso no encontrado' }),
    ApiConflictResponse({
      description: 'Conflicto con recurso existente',
    }),
    ApiInternalServerErrorResponse({
      description: 'Error interno del servidor',
    }),
  );
}
