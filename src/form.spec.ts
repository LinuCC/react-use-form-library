import { Form } from './form';
import { MappedValidation } from './validation';

type VoidFunction = () => void;

class UpdateTracker {
  wasCalled = false;
  submitted: Model | null = null;

  onUpdate: VoidFunction = () => {
    this.wasCalled = true;
  };

  reset: VoidFunction = () => {
    this.wasCalled = false;
    this.submitted = null;
  };

  onSubmit: (value: Form<Model>) => void = (form) => {
    this.submitted = form.model;
  };
}

const tracker = new UpdateTracker();

interface Model {
  name: string;
  age: number;
  description?: string;
  nullableValue: string | null;
  emails: string[];
  address: {
    streetName?: string;
    streetNumber?: number;
  };
  optionalContent?: {
    name?: string;
  };
  hobbies: Array<{ name: string }>;
}

const defaultValue: Model = {
  name: '',
  age: 18,
  nullableValue: null,
  emails: [],
  address: {},
  hobbies: [],
};

function createForm({
  validations,
  value,
  onSubmit,
  onSubmitError,
}: {
  value?: Partial<Model>;
  validations?: Partial<MappedValidation<Model>>;
  onSubmit?: (form: Form<Model>) => Promise<void> | void;
  onSubmitError?: (error: Error) => void;
} = {}): Form<Model> {
  return new Form<Model>({
    model: { ...defaultValue, ...(value || {}) },
    onUpdate: tracker.onUpdate,
    onSubmit: onSubmit ?? tracker.onSubmit,
    onSubmitError,
    validations,
  });
}

describe(Form, () => {
  beforeEach(() => tracker.reset());

  describe('instantiation', () => {
    const form = createForm();
    it('creates an empty field name', () => {
      expect(form.fields.name).toBeTruthy();
      expect(form.fields.name.value).toEqual('');
      expect(form.fields.name.dirty).toBeFalsy();
    });
    it('creates an pre filled field age', () => {
      expect(form.fields.age).toBeTruthy();
      expect(form.fields.age.value).toBeTruthy();
      expect(form.fields.age.dirty).toBeFalsy();
    });
    it('can be destructured', () => {
      const { value, valid, onChange, onBlur, onFocus } = form.fields.age;
      expect(value).toEqual(18);
      expect(valid).toEqual(true);
      expect(onChange).toBeDefined();
      expect(onFocus).toBeDefined();
      expect(onBlur).toBeDefined();
    });
    it('can create fields from null value', () => {
      const form2 = createForm({
        value: {
          nullableValue: null,
        },
      });
      expect(form2.fields.nullableValue.value).toBeNull();
      form2.fields.nullableValue.onChange('test');
      expect(form2.fields.nullableValue.value).toBe('test');
    });
    it('creates optional content by accessing it', () => {
      const form = createForm();
      expect(form.model.optionalContent).toBeUndefined();
      expect(form.fields.optionalContent.fields.name.value).toBeUndefined();
      expect(form.model.optionalContent).not.toBeUndefined();
    });
  });

  describe('tracking changes', () => {
    let form: Form<Model> = createForm();
    beforeEach(() => (form = createForm()));

    it('returns the updated model', () => {
      expect(form.changes).toEqual({});
      form.fields.name.onChange('test');
      expect(Object.keys(form.changes).includes('name')).toBeTruthy();
      expect(form.model.name).toBe('test');
    });

    it('is dirty only when there are changes', () => {
      expect(form.dirty).toBeFalsy();
      form.fields.name.onChange('test');
      expect(form.dirty).toBeTruthy();
    });

    it('invokes the callback when a value changes', () => {
      expect(form.fields.name.dirty).toBeFalsy();
      expect(form.fields.name.touched).toBeFalsy();
      form.fields.name.onChange('Freddy');
      expect(form.fields.name.dirty).toBeTruthy();
      expect(tracker.wasCalled).toBeTruthy();
    });

    it('invokes the callback for undefined values', () => {
      expect(form.fields.description).toBeDefined();
      expect(form.fields.description.value).toBeUndefined();
      expect(tracker.wasCalled).toBeFalsy();
      form.fields.description.onChange('Test description');
      expect(tracker.wasCalled).toBeTruthy();
    });

    it('mass assigns', () => {
      form.updateFields({ name: 'George', age: 5 });
      expect(form.changes).toEqual({ name: 'George', age: 5 });
    });

    it("doesn't track same value as a change", () => {
      form.fields.age.onChange(18);
      expect(form.fields.name.dirty).toBeFalsy();
      expect(form.changes).toEqual({});
    });

    it('updates nested objects', () => {
      form.fields.address.onChange({ streetName: 'Street', streetNumber: 12 });
      expect(form.fields.address.value).toEqual({
        streetName: 'Street',
        streetNumber: 12,
      });
    });

    it('updates array values', () => {
      form.fields.emails.onChange(['hello@example.com']);
      expect(form.fields.emails.value).toEqual(['hello@example.com']);
    });

    it('touches fields on blur', () => {
      expect(form.fields.name.touched).toEqual(false);
      form.fields.name.onFocus();
      expect(form.fields.name.touched).toEqual(false);
      form.fields.name.onBlur();
      expect(form.fields.name.touched).toEqual(true);
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
    });

    it('uses an array of validations', () => {
      const form = createForm({
        validations: { name: ['required', 'number'] },
      });
      expect(form.fields.name.required).toBeTruthy();
      expect(form.fields.name.valid).toBeFalsy();
      expect(form.fields.name.errors.length).toEqual(1);
      expect(form.valid).toBeFalsy();
      form.fields.name.onChange('5');
      expect(form.fields.name.valid).toBeTruthy();
      expect(form.valid).toBeTruthy();
    });

    it('ignores validations on non required', () => {
      const form = createForm({
        value: { name: '' },
        validations: { name: ['email'] },
      });
      expect(form.fields.name.valid).toBeTruthy();
      expect(form.valid).toBeTruthy();
      form.fields.name.onChange('test');
      expect(form.fields.name.valid).toBeFalsy();
      expect(form.valid).toBeFalsy();
    });

    it('uses a custom validation function', () => {
      const form = createForm({
        value: { age: 12 },
        validations: {
          age: ({ model }) => (model.age < 18 ? ['too young'] : []),
        },
      });
      expect(form.fields.age.errors).toEqual(['too young']);
      expect(form.fields.age.valid).toBeFalsy();
      form.fields.age.onChange(20);
      expect(form.fields.age.errors).toEqual([]);
      expect(form.fields.age.valid).toBeTruthy();
    });

    it('uses a custom regex for validation', () => {
      const form = createForm({
        validations: { name: /[a-g]/ },
      });
      form.fields.name.onChange('xyz');
      expect(form.valid).toBeFalsy();
      form.fields.name.onChange('ade');
      expect(form.valid).toBeTruthy();
    });

    it('validates arrays with custom functions', () => {
      const form = createForm({
        validations: {
          emails: ({ model }) =>
            model.emails.length === 0 ? ['specify at least one'] : [],
        },
      });
      expect(form.fields.emails.errors).toEqual(['specify at least one']);
      expect(form.fields.emails.valid).toEqual(false);
      form.fields.emails.onChange(['hello@example.com']);
      expect(form.fields.emails.valid).toEqual(true);
    });
  });

  describe('pre-defined validation', () => {
    it('validates a required field', () => {
      const form = createForm({
        validations: { name: 'required' },
      });
      expect(form.valid).toBeFalsy();
      form.fields.name.onChange('test');
      expect(form.valid).toBeTruthy();
    });
    it('validates an email field', () => {
      const form = createForm({
        validations: { name: 'email' },
      });
      form.fields.name.onChange('test');
      expect(form.valid).toBeFalsy();
      form.fields.name.onChange('test@example.com');
      expect(form.valid).toBeTruthy();
    });
    it('validates a json field', () => {
      const form = createForm({
        validations: { name: 'json' },
      });
      form.fields.name.onChange('test');
      expect(form.valid).toBeFalsy();
      form.fields.name.onChange('{ "foo": "baz"}');
      expect(form.valid).toBeTruthy();
    });
    it('validates a website field', () => {
      const form = createForm({
        validations: { name: 'website' },
      });
      form.fields.name.onChange('test');
      expect(form.valid).toBeFalsy();
      form.fields.name.onChange('https://google.com');
      expect(form.valid).toBeTruthy();
    });
    it('validates a number field', () => {
      const form = createForm({
        validations: { age: 'number' },
      });
      // eslint-disable-next-line
      // @ts-ignore
      form.fields.age.onChange('test');
      expect(form.valid).toBeFalsy();
      form.fields.age.onChange(12);
      expect(form.valid).toBeTruthy();
    });
  });

  describe('submitting', () => {
    it('prevents the event default', () => {
      const mock = jest.fn();
      const submitEvent = {
        preventDefault: mock,
      } as unknown as Event;
      const form = createForm();
      form.submit(submitEvent);
      expect(mock).toBeCalled();
    });

    it('invokes the submit handler if all fields are valid', () => {
      const form = createForm();
      expect(tracker.submitted).toBeFalsy();
      form.submit();
      expect(tracker.submitted).toBeTruthy();
    });

    it('does not submit if the fields are not valid', () => {
      const form = createForm({ validations: { name: 'required' } });
      form.submit();
      expect(tracker.submitted).toBeFalsy();
    });

    it('touches fields', () => {
      const form = createForm();
      expect(form.fields.name.touched).toBeFalsy();
      form.submit();
      expect(form.fields.name.touched).toBeTruthy();
    });

    it('can submit with null value', async () => {
      const form2 = createForm({
        value: {
          nullableValue: null,
        },
      });
      expect(form2.fields.nullableValue.value).toBeNull();
      await form2.submit();
    });

    it('handles async functions', async () => {
      const form = createForm({
        onSubmit: async (form) => {
          expect(form.submissionStatus).toBe('submitting');
        },
      });
      expect(form.submissionStatus).toBe('idle');
      await form.submit();
      expect(form.submissionStatus).toBe('submitted');
    });

    it('handles error', async () => {
      let error = null;
      const form = createForm({
        onSubmit: async (form) => {
          expect(form.submissionStatus).toBe('submitting');
          throw new Error('');
        },
        onSubmitError: (e: Error) => {
          error = e;
        },
      });
      await form.submit();
      expect(form.submissionStatus).toBe('error');
      expect(form.error).toBeTruthy();
      // Custom error handling
      expect(error).toBeTruthy();
    });
  });

  describe('reseting', () => {
    it('resets fields', () => {
      const form = createForm({
        value: {
          emails: ['bye@example.com', 'stay@example.com'],
        }
      });
      form.fields.name.onChange('hello');
      form.fields.emails.onChange([
        'hello@example.com', 'stay@example.com'
      ]);
      form.reset();
      expect(form.changes).toEqual({});
      expect(form.fields.name.value).toEqual('');
      expect(form.fields.emails.value).toEqual([
        'bye@example.com', 'stay@example.com'
      ]);
    });

    it('resets error', async () => {
      const form = createForm({
        onSubmit: async (form) => {
          expect(form.submissionStatus).toBe('submitting');
          throw new Error('');
        },
        onSubmitError: () => {
          // do nothing;
        },
      });
      await form.submit();
      // Reset error
      form.resetError();
      expect(form.submissionStatus).toBe('idle');
      expect(form.error).toBeUndefined();
    });

    it('resets valid and dirty fields', () => {
      const form = createForm({
        validations: { name: 'required' },
      });
      expect(form.valid).toBeFalsy();
      form.fields.name.onChange('test');
      expect(form.valid).toBeTruthy();

      form.reset();
      expect(form.valid).toEqual(false);
      expect(form.dirty).toEqual(false);
    });
    it('resets to idle if there are new changes after submitted', async () => {
      const form = createForm({});
      expect(form.submissionStatus).toEqual('idle');
      await form.submit();
      expect(form.submissionStatus).toEqual('submitted');
      form.fields.name.onChange('test');
      expect(form.submissionStatus).toEqual('idle');
    });
    it('resets to idle if there are new changes after submit error', async () => {
      const form = createForm({
        onSubmit: async () => {
          throw new Error('');
        },
        onSubmitError: () => {
          // do nothing;
        },
      });
      await form.submit();
      expect(form.submissionStatus).toBe('error');
      form.fields.name.onChange('test');
      expect(form.submissionStatus).toEqual('idle');
    });
  });

  describe('fields array', () => {
    describe('creating', () => {
      it('creates empty array', () => {
        const form = createForm({
          value: { emails: [] },
        });
        const emails = form.fields.emails;
        expect(emails.elements).toBeDefined();
        expect(Array.isArray(emails.elements)).toEqual(true);
        expect(emails.elements.length).toEqual(0);
      });
      it('adds a new field', () => {
        const form = createForm({
          value: { emails: [] },
        });
        const emails = form.fields.emails;
        emails.add('test');
        expect(emails.value.length).toEqual(1);
        expect(emails.elements.length).toEqual(1);
        expect(emails.elements[0].value).toEqual('test');
      });
      it('creates FormField for each element of the array', () => {
        const form = createForm({
          value: { emails: ['google.com', 'facebook.com'] },
        });
        const emails = form.fields.emails;
        expect(emails.elements[0].value).toEqual('google.com');
        expect(emails.elements[1].value).toEqual('facebook.com');
      });
    });
    describe('updating', () => {
      it('updates every field', () => {
        const form = createForm({
          value: { emails: ['google.com', 'facebook.com'] },
        });
        const emails = form.fields.emails;
        emails.onChange(['linkedin.com', 'twitter.com']);
        expect(emails.elements[0].value).toEqual('linkedin.com');
        expect(emails.elements[1].value).toEqual('twitter.com');
      });
      it('creates new fields when mass updating', () => {
        const form = createForm({
          value: { emails: [] },
        });
        const emails = form.fields.emails;
        emails.onChange(['linkedin.com', 'twitter.com']);
        expect(emails.elements[0].value).toEqual('linkedin.com');
        expect(emails.elements[1].value).toEqual('twitter.com');
      });
      it('resets all fields', () => {
        const form = createForm({
          value: { emails: ['google.com', 'facebook.com'] },
        });
        const emails = form.fields.emails;
        emails.elements[0].onChange('linkedin.com');
        emails.elements[1].onChange('twitter.com');
        emails.reset();
        expect(emails.elements[0].value).toEqual('google.com');
        expect(emails.elements[1].value).toEqual('facebook.com');
      });
      it('touches every field', () => {
        const form = createForm({
          value: { emails: ['google.com', 'facebook.com'] },
        });
        const emails = form.fields.emails;
        expect(emails.elements[0].touched).toEqual(false);
        emails.touch();
        expect(emails.elements[0].touched).toEqual(true);
        expect(emails.touched).toEqual(true);
      });
    });
    describe('deleting', () => {
      // DELETE
      it('removes a field', () => {
        const form = createForm({
          value: { emails: ['hello'] },
        });
        const emails = form.fields.emails;
        expect(emails.elements.length).toEqual(1);
        emails.add('test');
        expect(emails.elements.length).toEqual(2);
        emails.elements[1].remove();
        expect(emails.elements.length).toEqual(1);
        expect(emails.value).toEqual(['hello']);
      });
    });
    describe('validating', () => {
      it('validates fields', () => {
        const form = createForm({
          value: { emails: ['google@gmail.com', 'facebook@gmail.com'] },
          validations: {
            emails: 'email',
          },
        });
        const emails = form.fields.emails;
        emails.elements[0].onChange('test');
        expect(emails.elements[0].valid).toEqual(false);
        emails.elements[1].onChange('test');
        expect(emails.elements[1].valid).toEqual(false);
        expect(emails.valid).toEqual(false);
      });
      it('has the correct value', () => {
        const form = createForm({
          value: { emails: ['google.com', 'facebook.com'] },
        });
        const emails = form.fields.emails;
        emails.onChange(['linkedin.com', 'twitter.com']);
        expect(emails.value.length).toEqual(2);
        expect(emails.value[0]).toEqual('linkedin.com');
        expect(emails.value[1]).toEqual('twitter.com');
      });
      it('is dirty', () => {
        const form = createForm({
          value: { emails: ['google.com', 'facebook.com'] },
        });
        const emails = form.fields.emails;
        expect(emails.dirty).toBeFalsy();
        emails.elements[0].onChange('linkedin.com');
        expect(emails.elements[0].dirty).toBeTruthy();
        expect(emails.elements[1].dirty).toBeFalsy();
        expect(emails.dirty).toBeTruthy();
        expect(form.dirty).toBeTruthy();
      });
      it('is dirty when adding fields', () => {
        const form = createForm({
          value: { emails: ['google.com', 'facebook.com'] },
        });
        const emails = form.fields.emails;
        expect(emails.dirty).toBeFalsy();
        emails.add('instagram.com');
        expect(emails.dirty).toBeTruthy();
        expect(form.dirty).toBeTruthy();
      });
      it('is dirty when removing fields', () => {
        const form = createForm({
          value: { emails: ['google.com', 'facebook.com'] },
        });
        const emails = form.fields.emails;
        expect(emails.dirty).toBeFalsy();
        emails.elements[0].remove();
        expect(emails.dirty).toBeTruthy();
        expect(form.dirty).toBeTruthy();
      });
    });
  });

  describe('nested objects', () => {
    it('updates the value after changing nested fields', () => {
      const form = createForm();
      expect(form.fields.address.value).toEqual({});
      form.fields.address.fields.streetName.onChange('Test Address 123');
      expect(form.fields.address.value.streetName).toEqual('Test Address 123');
    });
    it('mass updates fields', () => {
      const form = createForm();
      form.fields.address.onChange({
        streetName: 'Test Address',
        streetNumber: 23,
      });
      expect(form.fields.address.fields.streetName.value).toEqual(
        'Test Address'
      );
      expect(form.fields.address.fields.streetNumber.value).toEqual(23);
    });
    it('validates every field', () => {
      const form = createForm({
        value: {
          address: {
            streetName: 'Test Address',
            streetNumber: 23,
          },
        },
        validations: {
          address: {
            streetName: 'required',
            streetNumber: 'number',
          },
        },
      });

      form.validate();
      expect(form.fields.address.fields.streetName.valid).toBeTruthy();
      form.fields.address.fields.streetName.onChange('');
      expect(form.fields.address.fields.streetName.valid).toBeFalsy();
    });
    it('touches every field', () => {
      const form = createForm();

      expect(form.fields.address.fields.streetName.touched).toBeFalsy();
      form.fields.address.touch();
      expect(form.fields.address.fields?.streetName.touched).toBeTruthy();
    });
    it('resets every field', () => {
      const form = createForm({
        value: { address: { streetName: 'original' } },
      });
      form.fields.address.onChange({
        streetName: 'Test Address',
        streetNumber: 23,
      });
      expect(form.fields.address.fields.streetName.value).toEqual(
        'Test Address'
      );
      form.fields.address.touch();
      expect(form.fields.address.fields.streetName.touched).toEqual(true);
      expect(form.fields.address.fields.streetName.dirty).toEqual(true);
      form.fields.address.reset();
      expect(form.fields.address.fields.streetName.dirty).toBeFalsy();
      expect(form.fields.address.fields.streetName.touched).toBeFalsy();
      expect(form.fields.address.fields.streetName.value).toEqual('original');
    });
    it('is valid when all fields are valid', () => {
      const form = createForm({
        value: {
          address: {
            streetName: '',
            streetNumber: 23,
          },
        },
        validations: {
          address: {
            streetName: 'required',
            streetNumber: 'number',
          },
        },
      });
      expect(form.valid).toBeFalsy();
      expect(form.fields.address.valid).toBeFalsy();
      form.fields.address.fields?.streetName.onChange('Test Address');
      expect(form.fields.address.valid).toBeTruthy();
      expect(form.valid).toBeTruthy();
    });
    it('is dirty when some fields are dirty', () => {
      const form = createForm({});
      expect(form.dirty).toBeFalsy();
      expect(form.fields.address.dirty).toBeFalsy();
      // Instantiate street Number
      form.fields.address.fields?.streetName.onChange('Test Address');
      expect(form.fields.address.fields?.streetName.dirty).toBeTruthy();
      expect(form.fields.address.fields?.streetNumber.dirty).toBeFalsy();
      expect(form.fields.address.dirty).toBeTruthy();
    });
  });
});
