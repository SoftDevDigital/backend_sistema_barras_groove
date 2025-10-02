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
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    await this.client.send(command);
  }

  async get(tableName: string, key: Record<string, any>): Promise<Record<string, any> | null> {
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
    });

    const result = await this.client.send(command);
    return result.Item || null;
  }

  async update(
    tableName: string,
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>
  ): Promise<Record<string, any>> {
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
  }

  async delete(tableName: string, key: Record<string, any>): Promise<void> {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });

    await this.client.send(command);
  }

  async query(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    indexName?: string
  ): Promise<Record<string, any>[]> {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
    });

    const result = await this.client.send(command);
    return result.Items || [];
  }

  async scan(
    tableName: string,
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>,
    expressionAttributeNames?: Record<string, string>,
    indexName?: string
  ): Promise<Record<string, any>[]> {
    const command = new ScanCommand({
      TableName: tableName,
      IndexName: indexName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
    });

    const result = await this.client.send(command);
    return result.Items || [];
  }
}
