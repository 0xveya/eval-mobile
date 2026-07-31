export type FortyTwoError =
	| {
			type: 'network';
			cause: unknown;
	  }
	| {
			type: 'http';
			status: number;
			body: unknown;
	  }
	| {
			type: 'invalid-response';
			issues: unknown;
	  };
