import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService.changePassword', () => {
  it('posts the current and the new password to the API', () => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    const service = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    let done = false;

    service.changePassword({ currentPassword: 'Old@1234', newPassword: 'New@12345' }).subscribe(() => (done = true));

    const request = http.expectOne(`${environment.apiUrl}/auth/change-password`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ currentPassword: 'Old@1234', newPassword: 'New@12345' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBeTrue();
    http.verify();
  });
});
