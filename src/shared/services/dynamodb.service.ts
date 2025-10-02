import { Injectable } from '@nestjs/common';
import { 
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDBDocumentClient, TABLE_NAMES } from '../config/dynamodb.config';

@Injectable()
export class DynamoDBService {
  private readonly client: DynamoDBDocumentClient;

  constructor() {
    this.client = dynamoDBDocumentClient;
  }

  async put(tableName: string, item: Record<string, any>): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: item,
      });

      await this.client.send(command);
    } catch (error) {
      console.error(`DynamoDB PUT error for table ${tableName}:`, error.message);
      
      // Si es error de conexión, no lanzar error para mantener la app funcionando
      if (error.name === 'NetworkingError' || error.name === 'TimeoutError') {
        console.warn(`DynamoDB connection issue for table ${tableName}, operation skipped`);
        return;
      }
      
      throw error;
    }
  }

  async get(tableName: string, key: Record<string, any>): Promise<Record<string, any> | null> {
    try {
      const command = new GetCommand({
        TableName: tableName,
        Key: key,
      });

      const result = await this.client.send(command);
      return result.Item || null;
    } catch (error) {
      console.error(`DynamoDB GET error for table ${tableName}:`, error.message);
      
      // Si es error de conexión, retornar null para mantener la app funcionando
      if (error.name === 'NetworkingError' || error.name === 'TimeoutError') {
        console.warn(`DynamoDB connection issue for table ${tableName}, returning null`);
        return null;
      }
      
      throw error;
    }
  }

  async update(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<Record<string, any>> {
    try {
      const command = new UpdateCommand({
        TableName: tableName,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.client.send(command);
      return result.Attributes || {};
    } catch (error) {
      console.error(`DynamoDB UPDATE error for table ${tableName}:`, error.message);
      throw error;
    }
  }

  async delete(tableName: string, key: Record<string, any>): Promise<void> {
    try {
      const command = new DeleteCommand({
        TableName: tableName,
        Key: key,
      });

      await this.client.send(command);
    } catch (error) {
      console.error(`DynamoDB DELETE error for table ${tableName}:`, error.message);
      throw error;
    }
  }

  async query(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    indexName?: string
  ): Promise<Record<string, any>[]> {
    try {
      const command = new QueryCommand({
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      });

      const result = await this.client.send(command);
      return result.Items || [];
    } catch (error) {
      console.error(`DynamoDB QUERY error for table ${tableName}:`, error.message);
      
      // Si es error de conexión, retornar array vacío para mantener la app funcionando
      if (error.name === 'NetworkingError' || error.name === 'TimeoutError') {
        console.warn(`DynamoDB connection issue for table ${tableName}, returning empty array`);
        return [];
      }
      
      throw error;
    }
  }

  async scan(
    tableName: string,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    indexName?: string
  ): Promise<Record<string, any>[]> {
    try {
      const command = new ScanCommand({
        TableName: tableName,
        IndexName: indexName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
      });

      const result = await this.client.send(command);
      return result.Items || [];
    } catch (error) {
      console.error(`DynamoDB SCAN error for table ${tableName}:`, error.message);
      
      // Si es error de conexión, retornar array vacío para mantener la app funcionando
      if (error.name === 'NetworkingError' || error.name === 'TimeoutError') {
        console.warn(`DynamoDB connection issue for table ${tableName}, returning empty array`);
        return [];
      }
      
      throw error;
    }
  }
}
