import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { validate } from '../../../utils/transferValidation';

import InputTransparent from '../../../components/InputTransparent';
import Input from './Input';
import { toFixedDecimals } from '../../../utils/balance';

type Props = {
  handleAmountChange: (number) => void;
  value: string;
};
function AmountInput(props: Props) {
  const dispatch = useDispatch();
  const amountEl = useRef(null);
  const {
    validate: showErrors,
    validations,
    token,
    isTransactionInProgress,
  } = useSelector((state: RootState) => state.transferInput);

  function handleAmountChange(event) {
    let value = event.target.value;
    const index = value.indexOf('.');
    switch (true) {
      case index === 0: {
        value = '0.';
        break;
      }
      case index >= 0 && index < value.length - 1: {
        value = toFixedDecimals(value, 8);
        break;
      }
      default: {
        break;
      }
    }

    props.handleAmountChange(value);
  }
  const validateAmount = () => validate(dispatch);

  const focus = () => {
    if (amountEl.current) {
      (amountEl.current as any).focus();
    }
  };

  return (
    <Input
      label="Amount"
      error={!!(showErrors && validations.amount)}
      editable
      onClick={focus}
    >
      {token ? (
        <InputTransparent
          inputRef={amountEl}
          placeholder="0.00"
          type="number"
          min={0}
          step={0.1}
          onChange={handleAmountChange}
          onPause={validateAmount}
          disabled={isTransactionInProgress}
          value={props.value}
        />
      ) : (
        <div>-</div>
      )}
    </Input>
  );
}

export default AmountInput;
