import React, { Component } from 'react';
import { Form, Button, Message, Card, Icon } from 'semantic-ui-react';
import Linnia from '@linniaprotocol/linnia-js';
import IPFS from 'ipfs-mini';
import  moment  from 'moment';
import web3 from '../ethereum/web3';
import config from '../config';
import SecretEventOrg from '../ethereum/SecretEventOrg';
import { decrypt, encrypt } from './crypto-utils';
import EthCrypto from 'eth-crypto';

const hubAddress = config.LINNIA_HUB_ADDRESS;
const protocol = config.LINNIA_IPFS_PROTOCOL;
const port = config.LINNIA_IPFS_PORT;
const host = config.LINNIA_IPFS_HOST;

const ipfs = new IPFS({ host: host, port: port, protocol: protocol });
const linnia = new Linnia(web3, ipfs, { hubAddress });

const gasPrice = 20000000000;
const gas = 500000;

function utilsIpfsDownloadAndDecrypt_callback(ipfsDataUri, privkey, cb) {
  ipfs.cat(ipfsDataUri, async (err, ipfsRes) => {
    if(err){
      cb(err, null)
    }else{
      const result = await decrypt(privkey, ipfsRes)
      cb(err, result)
    }
  });
}

class LinniaPermission extends Component {
  state = {
    status: [],
    ipfsDataUri: '',
    ipfsDownloadDecryptPrivKey: '',
    ipfsData: '',
  };

  componentDidMount() {
    const that = this;
    web3.eth.getAccounts().then(accounts => {
      const userAddress = accounts[0]

      linnia.getPermission(this.props.eventHash, userAddress)
      .then(linniaPermission => {
        if(linniaPermission && linniaPermission.canAccess && linniaPermission.dataUri){
          that.setState({dataUri: linniaPermission.dataUri, canAccess: linniaPermission.canAccess, userAddress})
        } else {
          that.setState({userAddress})
        }
      })
    })
  }

  render() {
    return (<div>
      <p>linniaPermission dataUri={this.state.dataUri} canAccess={this.state.canAccess} userAddress={this.state.userAddress}</p>
    </div>)
  }

}

class Separator extends Component {
  render() {
    return ( <hr/> )
  }
}

class IpfsDownloadAndDecrypt extends Component {
  state = {
    status: [],
    ipfsDataUri: '',
    ipfsDownloadDecryptPrivKey: '',
    ipfsData: '',
  };

  handleChangeIpfsDataUri = event => {
    this.setState({ ipfsDataUri: event.target.value });
  };

  handleChangeIpfsDownloadDecryptPrivKey = event => {
    this.setState({ ipfsDownloadDecryptPrivKey: event.target.value });
  };

  handleOnIpfsClick = event => {
    this.ipfsDataDownload(this.state.ipfsDataUri, this.state.ipfsDownloadDecryptPrivKey)
  }

  ipfsDataDownload = (ipfsDataUri, privkey) => {
    this.setState({status: ['loading event ipfs uri='+ipfsDataUri, ...this.state.status]})

    // Use ipfs library to pull the encrypted data down from IPFS
    ipfs.cat(ipfsDataUri, (err, ipfsRes) => {
      if(err){
        this.setState({status: ['ipfs download.failed. reason='+err.message, ...this.state.status], ipfsData: err})
      }else{
        this.setState({status: ['ipfs download.success', ...this.state.status], ipfsData: ipfsRes})
        decrypt(privkey, ipfsRes)
        .then(clear => {
          this.setState({status: ['ipfs download decrypt success', ...this.state.status], ipfsDataDecrypted: clear})
        })
        .catch(e => {
          this.setState({status: ['ipfs download decrypt failure', ...this.state.status], ipfsDataDecrypted: e})
        })
      }
    })
  }

  render() {
    return (
      <div>
        <p>ipfs uri <textarea rows="4" cols="50" value={this.state.ipfsDataUri} onChange={this.handleChangeIpfsDataUri} /></p>
        <p>private key <textarea rows="4" cols="50" value={this.state.ipfsDownloadDecryptPrivKey} onChange={this.handleChangeIpfsDownloadDecryptPrivKey} /></p>
        <p><button onClick={this.handleOnIpfsClick}>get ipfs data</button></p>
        <p>Ipfs data <textarea rows="4" cols="50" value={this.state.ipfsData} /></p>
        <p>Ipfs data decrypted <textarea rows="4" cols="50" value={this.state.ipfsDataDecrypted} /></p>
      </div>
    )
  }
}

class Decryptor extends Component {
  state = { decryptMe: '', privKey: '', result: '' };

  handleChange_decryptMe = event => {
    this.setState({ decryptMe: event.target.value });
    this.myDecrypt(event.target.value, this.state.privKey)
  };

  handleChange_privateKey = event => {
    this.setState({ privKey: event.target.value });
    this.myDecrypt(this.state.decryptMe, event.target.value)
  };

  myDecrypt = async (decryptMe, privateKey) => {
    if(decryptMe && privateKey){
      try {
        const result = await decrypt(privateKey, decryptMe);
        this.setState({ result });
      } catch (e) {
        this.setState({ result: e });
      }
    }
  };

  render() {
    return (<div>
      <ul>
        <li>decrypt this text <textarea rows="4" cols="50" value={this.state.decryptMe} onChange={this.handleChange_decryptMe} /> </li>
        <li>private key <textarea rows="4" cols="50" value={this.state.privKey} onChange={this.handleChange_privateKey} /> </li>
        <li>decrypted as <textarea rows="4" cols="50" value={this.state.result}/></li>
      </ul>
    </div>)
  }
 }

class Encryptor extends Component {
  state = { plaintext: '', pubkey: '', result: '' };

  handleChange_plaintext = event => {
    this.setState({ plaintext: event.target.value });
    this.myEncrypt(event.target.value, this.state.pubkey)
  };

  handleChange_pubkey = event => {
    this.setState({ pubkey: event.target.value });
    this.myEncrypt(this.state.plaintext, event.target.value)
  };

  myEncrypt = async (input, pubkey) => {
    if(input && pubkey){
      try {
        const result = await encrypt(pubkey, input);
        this.setState({ result });
      } catch (e) {
        this.setState({ result: e });
      }
    }
  };

  render() {
    return (<div>
      <ul>
        <li>encrypt this text <textarea rows="4" cols="50" value={this.state.plaintext} onChange={this.handleChange_plaintext} /> </li>
        <li>public key <textarea rows="4" cols="50" value={this.state.pubkey} onChange={this.handleChange_pubkey} /> </li>
        <li>encrypted as <textarea rows="4" cols="50" value={this.state.result}/></li>
      </ul>
    </div>)
  }
}

export default class Debugging extends Component {

  constructor(props) {
      super(props);

      this.state = {
        status:[],
        eventHash:'',
        keypairs_priv: '',
        keypairs_pub: '',
        userAddress: '',
        encryptInput: '',
        encryptResult: '',
        decryptResult: '',
        linniaPermission: '',
        ipfsData: '',
        ipfsDataDecrypted: '',
        ipfsDataUri: '',
        organizer: '',
        ipfsUploadInput:'',
        ipfsUploadUri:'',
        linniaRecordDataHash: '',
        linniaRecordPermission: '',
        linniaRecordPermissionDetails: '',
        linniaRecordPermissionToEthAddress: '',
        linniaRecordPermissionPubKey: '',
        linniaRecordPermissionMyPrivateKey: '',
        linniaRecordPermissionDataReEncrypted: '',
        linniaJsRecordDataHash: '',
        linniaJsRecordDataHashResult: '',
        linniaJsPermissionDataHash: '',
        ipfsDownloadDecryptPrivKey: ''
      }

      this.handleChangeEncryptInput = this.handleChangeEncryptInput.bind(this)
      this.handleOnCleanStatusClick = this.handleOnCleanStatusClick.bind(this)
      this.handleChangeIpfsDataUri = this.handleChangeIpfsDataUri.bind(this)
      this.handleOnIpfsClick = this.handleOnIpfsClick.bind(this)
      this.handleOnIpfsUploadClick = this.handleOnIpfsUploadClick.bind(this)
      this.handleChangeIpfsUploadInput = this.handleChangeIpfsUploadInput.bind(this)
      this.handleOnLinniaCreateRecordClick = this.handleOnLinniaCreateRecordClick.bind(this)
      this.handleOnLinniaCreateRecordPermissionClick = this.handleOnLinniaCreateRecordPermissionClick.bind(this)
      this.handleChangeLinniaRecordPermissionToEthAddress = this.handleChangeLinniaRecordPermissionToEthAddress.bind(this)
      this.handleChangeLinniaRecordPermissionPublicKey = this.handleChangeLinniaRecordPermissionPublicKey.bind(this)
      this.handleChangeLinniaJsRecordDataHash = this.handleChangeLinniaJsRecordDataHash.bind(this)
      this.handleChangeLinniaJsPermissionDataHash = this.handleChangeLinniaJsPermissionDataHash.bind(this)
      this.handleChangeLinniaJsPermissionEthAddress = this.handleChangeLinniaJsPermissionEthAddress.bind(this)
      this.handleOnChangePubKey = this.handleOnChangePubKey.bind(this)
      this.handleOnChangePrivKey = this.handleOnChangePrivKey.bind(this)
      this.handleChangeIpfsDownloadDecryptPrivKey = this.handleChangeIpfsDownloadDecryptPrivKey.bind(this)
      this.handleChangeLinniaRecordPermissionMyPrivateKey = this.handleChangeLinniaRecordPermissionMyPrivateKey.bind(this)
    }

    handleOnCleanStatusClick(){
      this.setState({status: []})
    }

    async componentDidMount(){
        var organizer = await SecretEventOrg.methods.organizer().call()
        var eventHash = await SecretEventOrg.methods.currentEventHash().call()
        this.setState({eventHash, organizer})

        this.encryptDecrypt('abc')
        this.linniaPermission()
    }

    handleChangeIpfsDataUri(event) {
      const ipfsDataUri = event.target.value
      this.setState({ipfsDataUri})
      //this.ipfsDataDownload(ipfsDataUri)
    }

    handleChangeLinniaRecordPermissionMyPrivateKey(event) {
      this.setState({linniaRecordPermissionMyPrivateKey: event.target.value})
    }

    async handleChangeLinniaRecordPermissionPublicKey(event) {
      const linniaRecordPermissionPublicKey = event.target.value
      console.log('handleChangeLinniaRecordPermissionPublicKey', linniaRecordPermissionPublicKey)
      this.setState({linniaRecordPermissionPublicKey})
      //await this.reEncrypt(this, linniaRecordPermissionPubKey, this.state.linniaRecordPermissionDataClearText)
    }

    async handleChangeLinniaRecordPermissionToEthAddress(event) {
      const ethAddress = event.target.value
      console.log('handleChangeLinniaRecordPermissionToEthAddress', ethAddress)
      this.setState({linniaRecordPermissionToEthAddress: ethAddress})
      //await this.reEncrypt(this, this.state.linniaRecordPermissionPubKey, this.state.linniaRecordPermissionDataClearText)
    }

    async reEncrypt(that, pubkey, input){
      if(pubkey && input){
        const encryptResult = await encrypt(pubkey, input);
        that.setState({linniaRecordPermissionDataReEncrypted: encryptResult})
      }
    }

    handleOnChangePubKey(event) {
      const input = event.target.value
      this.setState({keypairs_pub: input})
    }

    handleOnChangePrivKey(event) {
      const input = event.target.value
      this.setState({keypairs_priv: input})
    }

    handleChangeIpfsUploadInput(event) {
      const input = event.target.value
      this.setState({ipfsUploadInput: input})
    }

    handleOnIpfsUploadClick(event) {
      this.ipfsDataUploadPromise(this.state.ipfsUploadInput)
      .then(uri => {
        this.setState({status: ['ipfs upload success. uri='+uri, ...this.state.status], ipfsUploadResult: 'OK', ipfsUploadUri:uri })
      })
      .catch(e => {
        this.setState({status: ['ipfs upload failed'+e.message, ...this.state.status], ipfsUploadResult: 'FAILURE', ipfsUploadUri:''})
      })
    }

    handleChangeIpfsDownloadDecryptPrivKey(event){
      this.setState({ipfsDownloadDecryptPrivKey: event.target.value})
    }

    handleOnIpfsClick(){
      this.ipfsDataDownload(this.state.ipfsDataUri, this.state.ipfsDownloadDecryptPrivKey)
    }

    handleChangeEncryptInput(event) {
      const encryptInput = event.target.value
      this.encryptDecrypt(encryptInput)
    }

    async encryptDecrypt(encryptInput){
      if(this.state.keypairs_pub && this.state.keypairs_priv){
        const encryptResult = await encrypt(this.state.keypairs_pub, encryptInput);
        const decryptResult = await decrypt(this.state.keypairs_priv, encryptResult);
        this.setState({encryptInput, encryptResult, decryptResult})
      }
    }

    ipfsDataUploadPromise(data){
      return new Promise((resolve, reject) => {
        ipfs.add(data, (err, ipfsRed) => {
          err ? reject(err) : resolve(ipfsRed);
        });
      });
    }

    ipfsDataDownload(ipfsDataUri, privkey){
      //const uri = this.state.linniaPermission.dataUri
      this.setState({status: ['loading event ipfs uri='+ipfsDataUri, ...this.state.status]})

      // Use ipfs library to pull the encrypted data down from IPFS
      ipfs.cat(ipfsDataUri, async (err, ipfsRes) => {
        if(err){
          this.setState({status: ['ipfs download failed. reason='+err.message, ...this.state.status]})
        }else{
          this.setState({status: ['ipfs download success', ...this.state.status], ipfsData: ipfsRes})
          await this.ipfsDataDecrypt(ipfsRes, privkey) // this.state.keypairs_priv
        }
      })
    }

    async ipfsDataDecrypt(data, privkey){
      decrypt(privkey, data).then(decrypted => {
        this.setState({ipfsDataDecrypted: decrypted});
        console.log('ipfsDataDecrypt', data, decrypt)
      })
      .catch(e => {
        this.setState({ipfsDataDecrypted: 'error='+e.message});
        console.log('ipfsDataDecrypted.failed', e)
      })
    }

    async linniaCreateRecord(dataUri, metadata){
      const accounts = await web3.eth.getAccounts();
      const dataHash = await linnia.web3.utils.sha3(dataUri);

      try {
        const { records } = await linnia.getContractInstances();
        this.setState({linniaRecordDataHash:'processing transaction...'})
        await records.addRecord(dataHash, metadata, dataUri, { from: accounts[0] });
        this.setState({status: ["linnia record created with dataHash="+dataHash, ...this.state.status], linniaRecordDataHash:dataHash})
      } catch (err) {
        this.setState({status: ["linnia record creation failed. reason="+err.message, ...this.state.status], linniaRecordDataHash:err})
      }
    }

    async linniaPermission(){
      const accounts = await web3.eth.getAccounts()
      const userAddress = accounts[0]
      const linniaPermission = await linnia.getPermission(this.state.eventHash, userAddress)

      if(linniaPermission && linniaPermission.canAccess && linniaPermission.dataUri){
        this.setState({ipfsDataUri: linniaPermission.dataUri})
      }

      this.setState({userAddress, linniaPermission})
    }

    handleOnLinniaCreateRecordClick(event){
      this.linniaCreateRecord(this.state.ipfsUploadUri, 'mickDebug')
    }

    async handleOnLinniaCreateRecordPermissionClick(event){
      console.log('handleOnLinniaCreateRecordPermissionClick')

      const linniaJsRecordDataHashResult_obj = await linnia.getRecord(this.state.linniaRecordDataHash)
      // linniaJsRecordDataHashResult_obj.dataUri

      const that = this;

      async function cb(err, result) {
        if(err){
          that.setState({status: ['handleOnLinniaCreateRecordPermissionClick. ipfs download+decrypt.failed. reason='+err.message, ...that.state.status]})
          console.log('utilsIpfsDownloadAndDecrypt_callback', err)
          return
        }

        that.setState({status: ['handleOnLinniaCreateRecordPermissionClick. ipfs download+decrypt.ok='+result, ...that.state.status]})

        console.log('handleOnLinniaCreateRecordPermissionClick.cb.decrypteddatafromipfs', result)
        const encryptResult = await encrypt(that.state.linniaRecordPermissionPublicKey, result);
        that.setState({linniaRecordPermissionDataReEncrypted: encryptResult})
        console.log('linniaRecordPermissionDataReEncrypted', encryptResult)

        that.ipfsDataUploadPromise(encryptResult)
        .then(async (uri) => {
          console.log('handleOnLinniaCreateRecordPermissionClick', 'ipfsDataUploadPromise', uri)
          const [owner] = await web3.eth.getAccounts()
          const dataHash = that.state.linniaRecordDataHash
          const viewerEthereumAddress = that.state.linniaRecordPermissionToEthAddress
          await that.linniaCreateRecordPermission(dataHash, viewerEthereumAddress, uri, owner)
        })
        .catch(e => console.log)
      }

      utilsIpfsDownloadAndDecrypt_callback(linniaJsRecordDataHashResult_obj.dataUri, this.state.linniaRecordPermissionMyPrivateKey, cb)
    }

    async handleChangeLinniaJsRecordDataHash(event) {
      this.setState({linniaJsRecordDataHash: event.target.value})
      const linniaJsRecordDataHashResult_obj = await linnia.getRecord(event.target.value)
      if(linniaJsRecordDataHashResult_obj){
        try{
          const linniaJsRecordDataHashResult = JSON.stringify({owner: linniaJsRecordDataHashResult_obj.owner, metadataHash: linniaJsRecordDataHashResult_obj.metadataHash, dataUri: linniaJsRecordDataHashResult_obj.dataUri, timestamp: linniaJsRecordDataHashResult_obj.timestamp})
          this.setState({linniaJsRecordDataHashResult})
        } catch(e) {
          this.setState({linniaJsRecordDataHashResult: e})
        }
      }
    }

    async linniaCreateRecordPermission(dataHash, viewerEthereumAddress, ipfsDataUri, owner){
      // Create a new permissions record on the blockchain
      try {
        const { permissions } = await linnia.getContractInstances();

        this.setState({linniaRecordPermissionDetails:'dataHash='+dataHash+', viewerEthereumAddress='+viewerEthereumAddress+', ipfsDataUri='+ipfsDataUri+', owner='+owner})
        this.setState({linniaRecordPermission:'processing transaction...'})
        await permissions.grantAccess(dataHash, viewerEthereumAddress, ipfsDataUri, {
          from: owner,
          gasPrice,
          gas,
        });
        this.setState({linniaRecordPermission: "OK"})
      } catch (e) {
        this.setState({linniaRecordPermission: e})
      }
    }

    async handleChangeLinniaJsPermissionDataHash(event){
      this.setState({linniaJsPermissionDataHash: event.target.value})
      await this.lookupLinniaJsPermission(this, event.target.value, this.state.linniaJsPermissionDataHash)
    }

    async handleChangeLinniaJsPermissionEthAddress(event){
      this.setState({linniaJsPermissionEthAddress: event.target.value})
      await this.lookupLinniaJsPermission(this, this.state.linniaJsPermissionDataHash, event.target.value)
    }

    async lookupLinniaJsPermission(that, dataHash, viewerAddress){
      if(dataHash && viewerAddress){
        const linniaJsPermissionResult = await linnia.getPermission(dataHash, viewerAddress);
        //const linniaJsPermissionResult = JSON.stringify({ })
        that.setState({linniaJsPermissionResult: JSON.stringify({ linniaJsPermissionResult}) })
      }
    }

    hashCode = function(s) {
      var h = 0, l = s.length, i = 0;
      if ( l > 0 )
        while (i < l)
          h = (h << 5) - h + s.charCodeAt(i++) | 0;
      return h;
    };

    render() {

        const status = this.state.status.map(s => {
          return (<li key={this.hashCode(s)}>{s}</li>)
        })

        return (
            <div>

              <Separator />
              <div>
                <ul>
                  {status}
                  <li><button onClick={this.handleOnCleanStatusClick}>clean status</button></li>
                </ul>
              </div>

              <Separator />
              <div>
                <ul>
                  <li>eventHash is {this.state.eventHash}</li>
                  <li>organizer is {this.state.organizer}</li>
                </ul>
              </div>

              <Decryptor />
              <Separator />

              <Encryptor />
              <Separator />

              <LinniaPermission eventHash={this.state.eventHash} />
              <Separator />

              <IpfsDownloadAndDecrypt />

              <hr/><hr/>

              <div>
                <p>linnia record dataHash<textarea rows="4" cols="50" value={this.state.linniaJsRecordDataHash} onChange={this.handleChangeLinniaJsRecordDataHash} /></p>
                <p>result <textarea rows="4" cols="50" value={this.state.linniaJsRecordDataHashResult} /></p>
              </div>

              <hr/><hr/>

              <div>
                <p><textarea rows="4" cols="50" value={this.state.ipfsUploadInput} onChange={this.handleChangeIpfsUploadInput} /> </p>
                <p>{this.state.ipfsUploadInput}</p>
                <p><button onClick={this.handleOnIpfsUploadClick}>upload to ipfs</button></p>
                <p>{this.state.ipfsUploadResult} {this.state.ipfsUploadUri}</p>
                { this.state.ipfsUploadResult && this.state.ipfsUploadResult.startsWith("OK") &&
                  <div>
                    <p>only if OK</p>
                    <p><button onClick={this.handleOnLinniaCreateRecordClick}>create linnia record</button></p>
                    <p>linnia record dataHash {this.state.linniaRecordDataHash}</p>
                  </div>
                }
                { this.state.linniaRecordDataHash &&
                  <div>
                    <p>only if linnia record created</p>
                    <p>give permission to that record!</p>
                    <p>ETH @ <textarea rows="4" cols="50" value={this.state.linniaRecordPermissionToEthAddress} onChange={this.handleChangeLinniaRecordPermissionToEthAddress} /> </p>
                    <p>Public key <textarea rows="4" cols="50" value={this.state.linniaRecordPermissionPublicKey} onChange={this.handleChangeLinniaRecordPermissionPublicKey} /> </p>
                    <p>Private key to decrypt ipfs data <textarea rows="4" cols="50" value={this.state.linniaRecordPermissionMyPrivateKey} onChange={this.handleChangeLinniaRecordPermissionMyPrivateKey} /> </p>
                    <p>Encrypted data <textarea rows="4" cols="50" value={this.state.linniaRecordPermissionDataReEncrypted} /> </p>
                    <p><button onClick={this.handleOnLinniaCreateRecordPermissionClick}>create linnia record permission</button></p>
                    <p>the linnia record permission {this.state.linniaRecordPermission}</p>
                  </div>
                }
              </div>

              <hr/><hr/>

              <div>
                <p>linnia permission dataHash<textarea rows="4" cols="50" value={this.state.linniaJsPermissionDataHash} onChange={this.handleChangeLinniaJsPermissionDataHash} /></p>
                <p>linnia permission eth address<textarea rows="4" cols="50" value={this.state.linniaJsPermissionEthAddress} onChange={this.handleChangeLinniaJsPermissionEthAddress} /></p>
                <p>result <textarea rows="4" cols="50" value={this.state.linniaJsPermissionResult} /></p>
              </div>

            </div>
        );
    }
}
