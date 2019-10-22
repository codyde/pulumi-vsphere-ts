import * as pulumi from "@pulumi/pulumi";
import * as vsphere from "@pulumi/vsphere"

let dc = pulumi.output(vsphere.getDatacenter({
    name: "Core"
}));

let folder = new vsphere.Folder("Pulumi Builds", {
    datacenterId: dc.apply(dc => dc.id),
    path: "Pulumi Builds",
    type: "vm",
    });

let cluster = dc.apply(dc => vsphere.getComputeCluster({
    datacenterId: dc.id,
    name: "Tenant"
}));

let resourcePool = new vsphere.ResourcePool("Pulumi Resources", {
    parentResourcePoolId: cluster.apply(cluster => cluster.resourcePoolId),
});

let datastoreId = dc.apply(dc => vsphere.getDatastore({
    datacenterId: dc.id,
    name: "vsanDatastore"
}));

let networkId = dc.apply(dc => vsphere.getNetwork({
    datacenterId: dc.id,
    name: "VM Network"
}));

let template = dc.apply(dc => vsphere.getVirtualMachine({
    datacenterId: dc.id,
    name: "vsan_ubuntu_18"
}));

let pulumivm = new vsphere.VirtualMachine("pulumi01", {
    resourcePoolId: resourcePool.id,
    datastoreId: datastoreId.id,
    folder: folder.path,
    numCpus: 2,
    memory: 2048,
    guestId: template.guestId,
    networkInterfaces: [{
        networkId: networkId.id,
        adapterType: template.networkInterfaceTypes[0],
    }],
    disks: [{
        label: "disk0",
        size: template.disks[0].size,
        eagerlyScrub: template.disks[0].eagerlyScrub,
        thinProvisioned: template.disks[0].thinProvisioned,
    }],
    clone: {
        templateUuid: template.id,
        customize: {
            dnsServerLists: ["192.168.1.5"],
            dnsSuffixLists: ["humblelab.com"],
            ipv4Gateway: "192.168.1.1",
            linuxOptions: {
                domain: "humblelab.com",
                hostName: "master01"
            },
            networkInterfaces: [{
                dnsDomain: "humblelab.com",
                dnsServerLists: ["192.168.1.5"]
            }]
        }
    },
});

export let pulumivmip = pulumivm.defaultIpAddress
