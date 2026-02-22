import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SportPreferencesComponent } from './sport-preferences.component';

describe('SportPreferencesComponent', () => {
  let component: SportPreferencesComponent;
  let fixture: ComponentFixture<SportPreferencesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SportPreferencesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SportPreferencesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
