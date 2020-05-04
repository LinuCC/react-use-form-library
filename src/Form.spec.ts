import { Form } from './Form';
import { MappedValidation } from './types';

type VoidFunction = () => void;

class UpdateTracker {
  wasCalled = false;
  submitted = false;

  onUpdate: VoidFunction = () => {
    this.wasCalled = true;
  };

  reset: VoidFunction = () => {
    this.wasCalled = false;
  };

  onSubmit: VoidFunction = () => {
    this.submitted = true;
  };
}

const tracker = new UpdateTracker();

interface Model {
  name: string;
  age: number;
  description?: string;
}

function createForm({
  validations,
  value,
}: {
  value?: Partial<Model>;
  validations?: Partial<MappedValidation<Model>>;
} = {}): Form<Model> {
  const defaultValue = { name: '', age: 18 };
  return new Form<Model>({
    model: { ...defaultValue, ...(value || {}) },
    onUpdate: tracker.onUpdate,
    validations,
    handleSubmit: tracker.onSubmit,
  });
}

describe(Form, () => {
  beforeEach(() => tracker.reset());

  describe('instantiation', () => {
    const form = createForm();
    it('creates an empty field name', () => {
      expect(form.fields.name).toBeTruthy();
      expect(form.fields.name.value).toBeFalsy();
      expect(form.fields.name.dirty).toBeFalsy();
    });
    it('creates an pre filled field age', () => {
      expect(form.fields.age).toBeTruthy();
      expect(form.fields.age.value).toBeTruthy();
      expect(form.fields.age.dirty).toBeFalsy();
    });
  });

  describe('tracking changes', () => {
    it('returns the updated model', () => {
      const form = createForm();
      expect(form.changes).toEqual({});
      form.fields.name.onChange('test');
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      expect(form.originalModel.name).toBe('');
      expect(Object.keys(form.changes).includes('name')).toBeTruthy();
      expect(form.model.name).toBe('test');
    });

    it('is dirty only when there are changes', () => {
      const form = createForm();
      expect(form.dirty).toBeFalsy();
      form.fields.name.onChange('test');
      expect(form.dirty).toBeTruthy();
    });

    it('invokes the callback when a value changes', () => {
      const form = createForm();
      expect(form.fields.name.dirty).toBeFalsy();
      expect(form.fields.name.touched).toBeFalsy();
      form.fields.name.onChange('Freddy');
      expect(form.fields.name.dirty).toBeTruthy();
      expect(form.fields.name.touched).toBeTruthy();
      expect(tracker.wasCalled).toBeTruthy();
    });

    it('invokes the callback for undefined values', () => {
      const form = createForm();
      expect(form.fields.description).toBeDefined();
      expect(form.fields.description?.value).toBeUndefined();
      expect(tracker.wasCalled).toBeFalsy();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      form.fields.description!.onChange('Test description');
      expect(tracker.wasCalled).toBeTruthy();
    });

    it('resets', () => {
      const form = createForm();
      form.fields.name.onChange('hello');
      form.reset();
      expect(form.changes).toEqual({});
    });

    it('mass assigns', () => {
      const form = createForm();
      form.updateFields({ name: 'George', age: 5 });
      expect(form.changes).toEqual({ name: 'George', age: 5 });
    });

    it("doesn't track same value as a change", () => {
      const form = createForm();
      form.fields.age.onChange(18);
      expect(form.fields.name.dirty).toBeFalsy();
      expect(form.changes).toEqual({});
    });
  });

  describe('validation', () => {
    it('uses built in required validations', () => {
      const form = createForm({
        validations: { name: 'required' },
      });
      expect(form.fields.name.required).toBeTruthy();
      expect(form.fields.name.valid).toBeFalsy();
      expect(form.valid).toBeFalsy();
      form.fields.name.onChange('');
      expect(form.fields.name.valid).toBeFalsy();
      expect(form.valid).toBeFalsy();
      form.fields.name.onChange('Freddy');
      expect(form.fields.name.valid).toBeTruthy();
      expect(form.valid).toBeTruthy();
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      expect(form.validateFields()).toBeUndefined();
    });

    it('its valid when non-required fields are invalid', () => {
      const form = createForm({
        validations: { name: ['email'] },
      });
      form.fields.name.onChange('test');
      expect(form.fields.name.valid).toBeFalsy();
      expect(form.valid).toBeTruthy();
    });

    it('uses a built in email validation', () => {
      const form = createForm({
        validations: { name: ['email', 'required'] },
      });
      form.fields.name.onBlur();
      expect(form.valid).toBeFalsy();
      form.fields.name.onChange('test@example.com');
      expect(form.valid).toBeTruthy();
    });

    it('uses a custom validation function', () => {
      const form = createForm({
        validations: { name: [() => ['custom error']] },
      });
      form.fields.name.onBlur();
      expect(form.fields.name.valid).toBeFalsy();
      expect(form.fields.name.errors).toEqual(['custom error']);
    });
  });

  describe('submit', () => {
    it('submits', () => {
      const form = createForm();
      form.onSubmit();
      expect(form.submitting).toBeTruthy();
      expect(form.fields.name.touched).toBeTruthy();
      expect(form.fields.age.touched).toBeTruthy();
      expect(tracker.onSubmit).toBeTruthy();
    });
  });
});
