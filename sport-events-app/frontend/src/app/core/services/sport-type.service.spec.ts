import { TestBed } from '@angular/core/testing';

import { SportTypeService } from './sport-type.service';

describe('SportTypeService', () => {
  let service: SportTypeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SportTypeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
