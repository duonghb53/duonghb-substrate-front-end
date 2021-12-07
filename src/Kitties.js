import React, { useEffect, useState } from 'react';
import { Form, Grid } from 'semantic-ui-react';

import { useSubstrate } from './substrate-lib';
import { TxButton } from './substrate-lib/components';

import KittyCards from './KittyCards';

const convertToKittyHash = entry =>
    `0x${entry[0].toJSON().slice(-64)}`;

const constructKitty = (hash, { dna, price, gender, owner }) => ({
    id: hash,
    dna,
    price: price.toJSON(),
    gender: gender.toJSON(),
    owner: owner.toJSON()
});

export default function Kitties(props) {
    const { api, keyring } = useSubstrate();
    const { accountPair } = props;

    const [kittyHashes, setKittyHashes] = useState([]);
    const [kitties, setKitties] = useState([]);
    const [status, setStatus] = useState('');

    const subscribeKittyCnt = () => {
        let unsub = null;

        const asyncFetch = async () => {
            unsub = await api.query.substrateKitties.kittyCnt(async cnt => {
                // Fetch all kitty keys
                const entries = await api.query.substrateKitties.kitties.entries();
                const hashes = entries.map(convertToKittyHash);
                setKittyHashes(hashes);
            });
        };

        asyncFetch();

        return () => {
            unsub && unsub();
        };
    };

    const subscribeKitties = () => {
        let unsub = null;

        const asyncFetch = async () => {
            unsub = await api.query.substrateKitties.kitties.multi(kittyHashes, kitties => {
                const kittyArr = kitties
                    .map((kitty, ind) => constructKitty(kittyHashes[ind], kitty.value));
                setKitties(kittyArr);
            });
        };

        asyncFetch();

        // return the unsubscription cleanup function
        return () => {
            unsub && unsub();
        };
    };

    useEffect(subscribeKitties, [api, kittyHashes]);
    useEffect(subscribeKittyCnt, [api, keyring]);

    return <Grid.Column width={16}>
        <h1>Kitties</h1>
        <KittyCards kitties={kitties} accountPair={accountPair} setStatus={setStatus} />
        <Form style={{ margin: '1em 0' }}>
            <Form.Field style={{ textAlign: 'center' }}>
                <TxButton
                    accountPair={accountPair} label='Create Kitty' type='SIGNED-TX' setStatus={setStatus}
                    attrs={{
                        palletRpc: 'substrateKitties',
                        callable: 'createKitty',
                        inputParams: [],
                        paramFields: []
                    }}
                />
            </Form.Field>
        </Form>

        <div style={{ overflowWrap: 'break-word' }}>{status}</div>
    </Grid.Column>;
}

// Buy Modal
const BreedModal = props => {
    const { kitty, accountPair, setStatus } = props;
    const [open, setOpen] = React.useState(false);
    const [formValue, setFormValue] = React.useState({});
  
    const formChange = key => (ev, el) => {
      setFormValue({ ...formValue, [key]: el.value });
    };
  
    const confirmAndClose = (unsub) => {
      setOpen(false);
      if (unsub && typeof unsub === 'function') unsub();
    };
  
    return <Modal onClose={() => setOpen(false)} onOpen={() => setOpen(true)} open={open}
      trigger={<Button basic color='red'>Buy</Button>}>
      <Modal.Header>Buy Kitty</Modal.Header>
      <Modal.Content><Form>
        <Form.Input fluid label='Kitty ID' readOnly value={kitty.id} />
        <Form.Input fluid label='Bid Price' placeholder='Enter Price' onChange={formChange('target')} />
      </Form></Modal.Content>
      <Modal.Actions>
        <Button basic color='grey' onClick={() => setOpen(false)}>Cancel</Button>
        <TxButton
          accountPair={accountPair} label='Buy' type='SIGNED-TX' setStatus={setStatus}
          onClick={confirmAndClose}
          attrs={{
            palletRpc: 'substrateKitties',
            callable: 'buyKitty',
            inputParams: [kitty.id, formValue.target],
            paramFields: [true, true]
          }}
        />
      </Modal.Actions>
    </Modal>;
  };