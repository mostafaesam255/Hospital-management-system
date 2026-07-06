import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientLookup } from './patient-lookup';

describe('PatientLookup', () => {
  let component: PatientLookup;
  let fixture: ComponentFixture<PatientLookup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientLookup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientLookup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
