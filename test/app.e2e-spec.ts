import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from './../src/app.module';

// import { AppModule } from './../src/app.module';

describe('Inventory API (e2e)', () => {
  let app: INestApplication;

  let token: string;
  let categoryId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // LOGIN USER

  it('should login user', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'manager@example.com',
        password: 'manager123',
      });


    expect([200, 201]).toContain(response.status);

    token = response.body.accessToken;


    expect(token).toBeDefined();
  });

  // CREATE CATEGORY

  it('should create category', async () => {

  const categoryName = `Electronics-${Date.now()}`;

  const response = await request(app.getHttpServer())
    .post('/categories')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: categoryName,
      description: 'Electronic products',
    });


  expect([200, 201]).toContain(response.status);

  expect(response.body.id).toBeDefined();

  categoryId = response.body.id;
});

  // CREATE PRODUCT

  it('should create product', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Gaming Mouse',
        sku: `MOUSE-${Date.now()}`,
        description: 'RGB gaming mouse',
        priceInCents: 2500,
        costInCents: 1500,
        stock: 10,
        lowStockThreshold: 3,
        categoryId,
      });


    expect([200, 201]).toContain(response.status);

    expect(response.body.id).toBeDefined();

    productId = response.body.id;
  });

  // RESTOCK PRODUCT

  it('should restock product', async () => {
    const response = await request(app.getHttpServer())
      .post('/stock-movements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        type: 'restock',
        quantity: 20,
      });


    expect([200, 201]).toContain(response.status);

    expect(response.body.stockAfter).toBeDefined();
  });

  // SALE PRODUCT

  it('should reduce stock on sale', async () => {
    const response = await request(app.getHttpServer())
      .post('/stock-movements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        type: 'sale',
        quantity: 5,
      });


    expect([200, 201]).toContain(response.status);

    expect(response.body.stockAfter).toBeDefined();
  });

  // INVALID STOCK SALE

  it('should throw 422 for insufficient stock', async () => {
    const response = await request(app.getHttpServer())
      .post('/stock-movements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        type: 'sale',
        quantity: 1000,
      });


    expect(response.status).toBe(422);
  });

  // LOW STOCK PRODUCTS

  it('should return low stock products', async () => {
    const response = await request(app.getHttpServer())
      .get('/products/low-stock')
      .set('Authorization', `Bearer ${token}`);


    expect(response.status).toBe(200);
  });
});