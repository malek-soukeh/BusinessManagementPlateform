import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { UserCreatePayload } from '../models/user.models';
import { UserService } from './user.service';

describe('UserService', () => {
  const url = `${environment.apiUrl}/users`;
  const payload: UserCreatePayload = {
    firstName: 'Leila', lastName: 'Ben Salah', email: 'leila@techdistrib.tn', password: 'motdepasse1',
    phone: null, role: 'EMPLOYEE'
  };

  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the users page by page, oldest first', () => {
    service.list(1, 20).subscribe();

    const params = http.expectOne(req => req.url === url).request.params;
    expect(params.get('page')).toBe('1');
    expect(params.get('size')).toBe('20');
    expect(params.get('sort')).toBe('id,asc');
  });

  it('reads, creates, updates, changes the status and deletes a user', () => {
    const { password: _password, ...update } = payload;
    service.get(5).subscribe();
    service.create(payload).subscribe();
    service.update(5, update).subscribe();
    service.updateStatus(5, 'INACTIVE').subscribe();
    service.delete(5).subscribe();

    const requests = http.match(req => req.url.startsWith(url));
    expect(requests.map(req => `${req.request.method} ${req.request.url}`)).toEqual([
      `GET ${url}/5`, `POST ${url}`, `PUT ${url}/5`, `PATCH ${url}/5/status`, `DELETE ${url}/5`
    ]);
    expect(requests[1].request.body).toEqual(payload);
    expect(requests[2].request.body).toEqual(update);
    expect(requests[3].request.body).toEqual({ status: 'INACTIVE' });
  });
});
