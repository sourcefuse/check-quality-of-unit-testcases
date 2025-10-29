import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { VirtualBackgroundService } from './virtual-background.service';
import { ApiService } from '@telescope/core/api/api.service';
import { UserSessionStoreService } from '@telescope/core/store';
import { of, throwError } from 'rxjs';

describe('VirtualBackgroundService', () => {
  let service: VirtualBackgroundService;
  let apiService: jasmine.SpyObj<ApiService>;
  let httpMock: HttpTestingController;
  let userSessionStore: jasmine.SpyObj<UserSessionStoreService>;

  const mockBackgrounds = [
    {
      id: '1',
      name: 'Beach Background',
      imageUrl: 'https://example.com/beach.jpg',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      name: 'Office Background',
      imageUrl: 'https://example.com/office.jpg',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    const apiServiceSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'patch', 'delete']);
    const userSessionStoreSpy = jasmine.createSpyObj('UserSessionStoreService', ['getUser', 'getToken']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        VirtualBackgroundService,
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: UserSessionStoreService, useValue: userSessionStoreSpy }
      ]
    });

    service = TestBed.inject(VirtualBackgroundService);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    httpMock = TestBed.inject(HttpTestingController);
    userSessionStore = TestBed.inject(UserSessionStoreService) as jasmine.SpyObj<UserSessionStoreService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  describe('getVirtualBackgrounds', () => {
    it('should fetch all virtual backgrounds', () => {
      apiService.get.and.returnValue(of(mockBackgrounds));

      service.getVirtualBackgrounds().subscribe(backgrounds => {
        expect(backgrounds).toEqual(mockBackgrounds);
        expect(backgrounds.length).toBe(2);
      });

      expect(apiService.get).toHaveBeenCalledWith('/virtual-backgrounds');
    });

    it('should handle error when fetching backgrounds fails', () => {
      const errorMessage = 'Failed to fetch backgrounds';
      apiService.get.and.returnValue(throwError(() => new Error(errorMessage)));

      service.getVirtualBackgrounds().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe(errorMessage);
        }
      });
    });
  });

  describe('addVirtualBackground', () => {
    it('should add a new virtual background', () => {
      const newBackground = {
        name: 'Mountain Background',
        imageUrl: 'https://example.com/mountain.jpg',
        isDefault: false
      };

      const expectedResponse = {
        ...newBackground,
        id: '3',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      apiService.post.and.returnValue(of(expectedResponse));

      service.addVirtualBackground(newBackground).subscribe(background => {
        expect(background).toEqual(expectedResponse);
        expect(background.id).toBe('3');
      });

      expect(apiService.post).toHaveBeenCalledWith('/virtual-backgrounds', newBackground);
    });

    it('should handle validation error for invalid image URL', () => {
      const invalidBackground = {
        name: 'Invalid Background',
        imageUrl: 'invalid-url',
        isDefault: false
      };

      const errorResponse = {
        error: { message: 'Invalid image URL format' },
        status: 400
      };

      apiService.post.and.returnValue(throwError(() => errorResponse));

      service.addVirtualBackground(invalidBackground).subscribe({
        next: () => fail('Expected validation error'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('Invalid image URL');
        }
      });
    });

    it('should handle empty name validation', () => {
      const invalidBackground = {
        name: '',
        imageUrl: 'https://example.com/image.jpg',
        isDefault: false
      };

      const errorResponse = {
        error: { message: 'Background name is required' },
        status: 400
      };

      apiService.post.and.returnValue(throwError(() => errorResponse));

      service.addVirtualBackground(invalidBackground).subscribe({
        next: () => fail('Expected validation error'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('Background name is required');
        }
      });
    });
  });

  describe('updateVirtualBackground', () => {
    it('should update an existing virtual background', () => {
      const backgroundId = '1';
      const updates = {
        name: 'Updated Beach Background',
        imageUrl: 'https://example.com/beach-updated.jpg'
      };

      const expectedResponse = {
        id: backgroundId,
        ...updates,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      apiService.patch.and.returnValue(of(expectedResponse));

      service.updateVirtualBackground(backgroundId, updates).subscribe(background => {
        expect(background).toEqual(expectedResponse);
        expect(background.name).toBe('Updated Beach Background');
      });

      expect(apiService.patch).toHaveBeenCalledWith(`/virtual-backgrounds/${backgroundId}`, updates);
    });

    it('should handle error when background not found', () => {
      const backgroundId = 'non-existent';
      const updates = { name: 'Updated Name' };

      const errorResponse = {
        error: { message: 'Background not found' },
        status: 404
      };

      apiService.patch.and.returnValue(throwError(() => errorResponse));

      service.updateVirtualBackground(backgroundId, updates).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(404);
          expect(error.error.message).toContain('Background not found');
        }
      });
    });

    it('should handle concurrent update conflict', () => {
      const backgroundId = '1';
      const updates = { name: 'Updated Name' };

      const errorResponse = {
        error: { message: 'Background was modified by another user' },
        status: 409
      };

      apiService.patch.and.returnValue(throwError(() => errorResponse));

      service.updateVirtualBackground(backgroundId, updates).subscribe({
        next: () => fail('Expected conflict error'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toContain('modified by another user');
        }
      });
    });
  });

  describe('deleteVirtualBackground', () => {
    it('should delete a virtual background', () => {
      const backgroundId = '1';
      apiService.delete.and.returnValue(of({ success: true }));

      service.deleteVirtualBackground(backgroundId).subscribe(response => {
        expect(response.success).toBe(true);
      });

      expect(apiService.delete).toHaveBeenCalledWith(`/virtual-backgrounds/${backgroundId}`);
    });

    it('should handle error when trying to delete default background', () => {
      const backgroundId = '2'; // Default background
      const errorResponse = {
        error: { message: 'Cannot delete default background' },
        status: 400
      };

      apiService.delete.and.returnValue(throwError(() => errorResponse));

      service.deleteVirtualBackground(backgroundId).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('Cannot delete default background');
        }
      });
    });

    it('should handle error when background is in use', () => {
      const backgroundId = '1';
      const errorResponse = {
        error: { message: 'Background is currently in use by active sessions' },
        status: 409
      };

      apiService.delete.and.returnValue(throwError(() => errorResponse));

      service.deleteVirtualBackground(backgroundId).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.message).toContain('currently in use');
        }
      });
    });
  });

  describe('setDefaultVirtualBackground', () => {
    it('should set a virtual background as default', () => {
      const backgroundId = '1';
      const expectedResponse = {
        ...mockBackgrounds[0],
        isDefault: true
      };

      apiService.patch.and.returnValue(of(expectedResponse));

      service.setDefaultVirtualBackground(backgroundId).subscribe(background => {
        expect(background).toEqual(expectedResponse);
        expect(background.isDefault).toBe(true);
      });

      expect(apiService.patch).toHaveBeenCalledWith(`/virtual-backgrounds/${backgroundId}/set-default`, {});
    });

    it('should handle error when background not found', () => {
      const backgroundId = 'non-existent';
      const errorResponse = {
        error: { message: 'Background not found' },
        status: 404
      };

      apiService.patch.and.returnValue(throwError(() => errorResponse));

      service.setDefaultVirtualBackground(backgroundId).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(404);
        }
      });
    });

    it('should handle setting same background as default multiple times', () => {
      const backgroundId = '2'; // Already default
      const expectedResponse = mockBackgrounds[1];

      apiService.patch.and.returnValue(of(expectedResponse));

      service.setDefaultVirtualBackground(backgroundId).subscribe(background => {
        expect(background.isDefault).toBe(true);
      });

      expect(apiService.patch).toHaveBeenCalledWith(`/virtual-backgrounds/${backgroundId}/set-default`, {});
    });
  });

  describe('Edge Cases', () => {
    it('should handle large image file size', () => {
      const largeBackground = {
        name: 'Large Background',
        imageUrl: 'https://example.com/large-image.jpg',
        fileSize: 10485760, // 10MB
        isDefault: false
      };

      const errorResponse = {
        error: { message: 'Image size exceeds maximum allowed size of 5MB' },
        status: 413
      };

      apiService.post.and.returnValue(throwError(() => errorResponse));

      service.addVirtualBackground(largeBackground).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(413);
          expect(error.error.message).toContain('exceeds maximum allowed size');
        }
      });
    });

    it('should handle unsupported image format', () => {
      const invalidFormatBackground = {
        name: 'Invalid Format',
        imageUrl: 'https://example.com/image.bmp',
        isDefault: false
      };

      const errorResponse = {
        error: { message: 'Unsupported image format. Please use JPG, PNG, or WebP' },
        status: 415
      };

      apiService.post.and.returnValue(throwError(() => errorResponse));

      service.addVirtualBackground(invalidFormatBackground).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.status).toBe(415);
          expect(error.error.message).toContain('Unsupported image format');
        }
      });
    });

    it('should handle network timeout', () => {
      const newBackground = {
        name: 'Test Background',
        imageUrl: 'https://example.com/test.jpg',
        isDefault: false
      };

      const errorResponse = {
        error: { message: 'Request timeout' },
        status: 408
      };

      apiService.post.and.returnValue(throwError(() => errorResponse));

      service.addVirtualBackground(newBackground).subscribe({
        next: () => fail('Expected timeout error'),
        error: (error) => {
          expect(error.status).toBe(408);
          expect(error.error.message).toContain('timeout');
        }
      });
    });

    it('should handle unauthorized access', () => {
      userSessionStore.getToken.and.returnValue(null);

      const errorResponse = {
        error: { message: 'Unauthorized access' },
        status: 401
      };

      apiService.get.and.returnValue(throwError(() => errorResponse));

      service.getVirtualBackgrounds().subscribe({
        next: () => fail('Expected unauthorized error'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.error.message).toContain('Unauthorized');
        }
      });
    });

    it('should handle insufficient permissions', () => {
      const backgroundId = '1';
      const errorResponse = {
        error: { message: 'Insufficient permissions to perform this action' },
        status: 403
      };

      apiService.delete.and.returnValue(throwError(() => errorResponse));

      service.deleteVirtualBackground(backgroundId).subscribe({
        next: () => fail('Expected permission error'),
        error: (error) => {
          expect(error.status).toBe(403);
          expect(error.error.message).toContain('Insufficient permissions');
        }
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk delete of virtual backgrounds', () => {
      const backgroundIds = ['1', '3', '4'];
      const expectedResponse = {
        deleted: 3,
        failed: 0,
        errors: []
      };

      apiService.post.and.returnValue(of(expectedResponse));

      service.bulkDeleteVirtualBackgrounds(backgroundIds).subscribe(response => {
        expect(response.deleted).toBe(3);
        expect(response.failed).toBe(0);
      });

      expect(apiService.post).toHaveBeenCalledWith('/virtual-backgrounds/bulk-delete', { ids: backgroundIds });
    });

    it('should handle partial failure in bulk delete', () => {
      const backgroundIds = ['1', '2', '3'];
      const expectedResponse = {
        deleted: 2,
        failed: 1,
        errors: [{ id: '2', error: 'Cannot delete default background' }]
      };

      apiService.post.and.returnValue(of(expectedResponse));

      service.bulkDeleteVirtualBackgrounds(backgroundIds).subscribe(response => {
        expect(response.deleted).toBe(2);
        expect(response.failed).toBe(1);
        expect(response.errors[0].error).toContain('Cannot delete default background');
      });
    });
  });

  describe('Pagination and Filtering', () => {
    it('should fetch paginated virtual backgrounds', () => {
      const paginationParams = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const paginatedResponse = {
        data: mockBackgrounds,
        total: 2,
        page: 1,
        limit: 10
      };

      apiService.get.and.returnValue(of(paginatedResponse));

      service.getVirtualBackgroundsPaginated(paginationParams).subscribe(response => {
        expect(response.data).toEqual(mockBackgrounds);
        expect(response.total).toBe(2);
        expect(response.page).toBe(1);
      });

      expect(apiService.get).toHaveBeenCalledWith('/virtual-backgrounds', { params: paginationParams });
    });

    it('should filter virtual backgrounds by search term', () => {
      const searchTerm = 'beach';
      const filteredBackgrounds = [mockBackgrounds[0]];

      apiService.get.and.returnValue(of(filteredBackgrounds));

      service.searchVirtualBackgrounds(searchTerm).subscribe(backgrounds => {
        expect(backgrounds.length).toBe(1);
        expect(backgrounds[0].name).toContain('Beach');
      });

      expect(apiService.get).toHaveBeenCalledWith('/virtual-backgrounds/search', { params: { query: searchTerm } });
    });
  });
});