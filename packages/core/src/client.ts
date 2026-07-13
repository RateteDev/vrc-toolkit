// The SDK entry point. A VrcClient is a transport plus a set of endpoint
// namespaces. Namespaces are attached here as they are ported; construction
// takes only a transport so the same client works over session reuse or
// credential login without changing call sites.

import { AuthResource } from "./namespaces/auth";
import { AvatarsResource } from "./namespaces/avatars";
import { FilesResource } from "./namespaces/files";
import { FriendsResource } from "./namespaces/friends";
import { GroupsResource } from "./namespaces/groups";
import { InstancesResource } from "./namespaces/instances";
import { InventoryResource } from "./namespaces/inventory";
import { InviteResource } from "./namespaces/invite";
import { NotesResource } from "./namespaces/notes";
import { PrintsResource } from "./namespaces/prints";
import { UsersResource } from "./namespaces/users";
import { WorldsResource } from "./namespaces/worlds";
import type { VrcTransport } from "./transport/types";

export class VrcClient {
  readonly auth: AuthResource;
  readonly users: UsersResource;
  readonly worlds: WorldsResource;
  readonly groups: GroupsResource;
  readonly friends: FriendsResource;
  readonly notes: NotesResource;
  readonly prints: PrintsResource;
  readonly avatars: AvatarsResource;
  readonly inventory: InventoryResource;
  readonly files: FilesResource;
  readonly invite: InviteResource;
  readonly instances: InstancesResource;

  constructor(readonly transport: VrcTransport) {
    this.auth = new AuthResource(transport);
    this.users = new UsersResource(transport);
    this.worlds = new WorldsResource(transport);
    this.groups = new GroupsResource(transport);
    this.friends = new FriendsResource(transport);
    this.notes = new NotesResource(transport);
    this.prints = new PrintsResource(transport);
    this.avatars = new AvatarsResource(transport);
    this.inventory = new InventoryResource(transport);
    this.files = new FilesResource(transport);
    this.invite = new InviteResource(transport);
    this.instances = new InstancesResource(transport);
  }
}
